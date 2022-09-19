/*
ChannelActions Bot
Telegram: @ChannelActionsBot

(c) Aditya, https://xditya.me
*/

import config from "./env.ts";
import { get_perms } from "./helpers.ts";
import {
  addUser,
  countUsers,
  getAllSettings,
  getSettings,
  setStatus,
  setWelcome,
} from "./db.ts";

import {
  Bot,
  Context,
  GrammyError,
  HttpError,
  InlineKeyboard,
  session,
} from "grammy/mod.ts";
import { hydrate, HydrateFlavor } from "hydrate";
import {
  type Conversation,
  type ConversationFlavor,
  conversations,
  createConversation,
} from "conversations";

export type MyContext = HydrateFlavor<Context> & Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

export const bot = new Bot<MyContext>(config.BOT_TOKEN);
bot.use(hydrate());
bot.use(session({ initial: () => ({}) }));
bot.use(conversations());
bot.use(createConversation(inputWelcomeMsg));

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

const owners: number[] = [];
for (const owner of config.OWNERS.split(" ")) {
  owners.push(Number(owner));
}
const start_msg = `Hi {user}!
*I'm Channel Actions Bot, a bot mainly focused on working with the new* [admin approval invite links](https://t.me/telegram/153).

_I can_:
- _Auto approve new join requests._
- _Auto Decline New Join Requests._

\`Click the below button to know how to use me!\``;

const start_buttons = new InlineKeyboard()
  .text("How to use me ❓", "helper").row()
  .url("Updates", "https://t.me/BotzHub");

const help_msg = `<b>Usage instructions.</b>
    
Add me to your channel as administrator, with "add users" permission, and forward me a message from that chat to set me up!

To approve members who are already in waiting list, upgrade to premium for 3$ per month! Contact @xditya_bot if interested.`;

bot
  .chatType("private")
  .command("start", async (ctx) => {
    await ctx.reply(start_msg.replace("{user}", ctx.from.first_name), {
      parse_mode: "Markdown",
      reply_markup: start_buttons,
      disable_web_page_preview: true,
    });
    await addUser(ctx.from.id);
  });

bot.callbackQuery("helper", async (ctx) => {
  await ctx.editMessageText(
    help_msg,
    {
      reply_markup: new InlineKeyboard().text("Main Menu 📭", "start"),
      parse_mode: "HTML",
    },
  );
});

bot.callbackQuery("start", async (ctx) => {
  try {
    await ctx.editMessageText(
      start_msg.replace("{user}", ctx.from.first_name),
      {
        reply_markup: start_buttons,
        disable_web_page_preview: true,
        parse_mode: "Markdown",
      },
    );
  } catch (e) {
    console.error(e);
  }
});

bot
  .chatType("private")
  .filter((ctx) =>
    !ctx.msg?.text?.startsWith("/") &&
    ctx.msg?.forward_from_chat?.type == "channel"
  )
  .on("message", async (ctx) => {
    const chat = ctx.msg?.forward_from_chat?.id;
    if (chat == undefined) return;
    const res = await get_perms(bot, chat, ctx.from.id);
    if (res == null) {
      return await ctx.reply(
        "Either I am not added in the chat as admin, or you are not an admin in the chat!",
      );
    }
    if (!res) return await ctx.reply("You are not an admin in the chat!");
    const chatInfo = await bot.api.getChat(chat);
    if (chatInfo.type == "private") return;
    const current_settings = await getSettings(chat);
    let autoappr;
    if (current_settings == null) autoappr = true;
    else autoappr = current_settings.status ?? true;
    const settings_buttons = new InlineKeyboard()
      .text("Approve New Members", `approve_${chat}`).row()
      .text("Decline New Members", `decline_${chat}`).row()
      .text("Custom Welcome Message", `custom_welcome_${chat}`);
    await ctx.reply(
      `*Settings for ${chatInfo.title}*\n\nCurrent settings:\nAutoApprove: ${autoappr}`,
      {
        reply_markup: settings_buttons,
        parse_mode: "Markdown",
      },
    );
  });

bot.callbackQuery(/settings_page_(.*)/, async (ctx) => {
  const chat = ctx.match?.[1];
  if (chat == undefined) return;
  const chatInfo = await bot.api.getChat(Number(chat));
  if (chatInfo.type == "private") return;
  const current_settings = await getSettings(Number(chat));
  let autoappr;
  if (current_settings == null) autoappr = true;
  else autoappr = current_settings.status ?? true;
  const settings_buttons = new InlineKeyboard()
    .text("Approve New Members", `approve_${chat}`).row()
    .text("Decline New Members", `decline_${chat}`).row()
    .text("Custom Welcome Message", `welcome_${chat}`);
  await ctx.editMessageText(
    `*Settings for ${chatInfo.title}*\n\nCurrent settings:\nAutoApprove: ${autoappr}`,
    {
      reply_markup: settings_buttons,
      parse_mode: "Markdown",
    },
  );
});

bot.callbackQuery(/approve_(.*)/, async (ctx) => {
  const chatID = ctx.match?.[1];
  if (chatID == undefined) return;
  await setStatus(Number(chatID), true);
  const chatInfo = await bot.api.getChat(Number(chatID));
  if (chatInfo.type == "private") return;
  await ctx.editMessageText(
    `Settings updated! New join requests in the channel ${chatInfo.title} will be approved automatically!`,
    {
      reply_markup: new InlineKeyboard().text(
        "Back",
        `settings_page_${chatID}`,
      ),
    },
  );
});

bot.callbackQuery(/decline_(.*)/, async (ctx) => {
  const chatID = ctx.match?.[1];
  if (chatID == undefined) return;
  await setStatus(Number(chatID), false);
  const chatInfo = await bot.api.getChat(Number(chatID));
  if (chatInfo.type == "private") return;
  await ctx.editMessageText(
    `Settings updated! New join requests in the channel ${chatInfo.title} will be declined automatically!`,
    {
      reply_markup: new InlineKeyboard().text(
        "Back",
        `settings_page_${chatID}`,
      ),
    },
  );
});

async function inputWelcomeMsg(conversation: MyConversation, ctx: MyContext) {
  const chatID = ctx.match?.[1];
  if (chatID == undefined) return;
  await ctx.editMessageText(
    "Enter the welcome message you want the new approved/disapproved members to recieve.\n\nAvailable formattings:\n- {name} - users name.\n- {chat} - chat title.",
  );
  const resp = await conversation.waitFor(":text");
  if (!resp.msg.text) {
    return await ctx.reply("Please provide a message!", {
      reply_markup: new InlineKeyboard().text(
        "Back",
        `settings_page_${chatID}`,
      ),
    });
  }
  await setWelcome(Number(chatID), resp.msg.text);
  await ctx.reply(`Welcome message set to: \n${resp.msg.text}`, {
    reply_markup: new InlineKeyboard().text(
      "Back",
      `settings_page_${chatID}`,
    ),
  });
}
bot.callbackQuery(/welcome_(.*)/, async (ctx) => {
  await ctx.conversation.enter("inputWelcomeMsg");
});

bot.on("chat_join_request", async (ctx) => {
  if (!ctx.update.chat_join_request) return;
  const update = ctx.update.chat_join_request;
  const settings = await getSettings(update.chat.id);
  let approve_or_not, welcome;
  const def_welcome_approve =
    "Hey {name}, your request to join {chat} has been approved!";
  const def_welcome_decline =
    "Hey {name}, your request to join {chat} has been declined!";

  if (settings == null) {
    approve_or_not = true;
    welcome = def_welcome_approve;
  } else {
    approve_or_not = settings.status;
    if (approve_or_not == true) {
      welcome = settings.welcome ?? def_welcome_approve;
      if (welcome == "") welcome = def_welcome_approve;
    } else {
      welcome = settings.welcome ?? def_welcome_decline;
      if (welcome == "") welcome = def_welcome_decline;
    }
  }

  // try to approve
  try {
    if (approve_or_not) {
      await bot.api.approveChatJoinRequest(update.chat.id, update.from.id);
    } else {
      await bot.api.declineChatJoinRequest(update.chat.id, update.from.id);
    }
  } catch (error) {
    if (error.error_code == 400 || error.error_code == 403) return;
    console.log("Error while approving user: ", error.message);
    return;
  }

  welcome += "\n\nSend /start to know more!";
  welcome = welcome.replace("{name}", update.from.first_name).replace(
    "{chat}",
    update.chat.title,
  );

  // try to send a message
  try {
    await bot.api.sendMessage(
      update.from.id,
      welcome,
    );
  } catch (error) {
    if (error.error_code == 403) return;
    console.log("Error while sending a message: ", error.message);
    return;
  }
});

bot
  .filter((ctx) => owners.includes(ctx.from?.id ?? 0))
  .chatType("private")
  .command("stats", async (ctx) => {
    const reply = await ctx.reply("Calculating...");
    await bot.api.editMessageText(
      ctx.from.id,
      reply.message_id,
      `Total users: ${await countUsers()}\nChats with modified settings: ${
        (await getAllSettings()).length
      }`,
    );
  });
await bot.init();
console.info(`Started Bot - @${bot.botInfo.username}`);
console.info("\nDo join @BotzHub!\nBy - @xditya.\n");
