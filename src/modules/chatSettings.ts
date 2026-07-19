import { MyContext } from "../core/types.ts";
import { getSettings, setStatus, setWelcome } from "../database/welcomeDb.ts";
import { addAdmin, upsertChat } from "../database/chatsDb.ts";
import { get_perms } from "../helpers/permChecker.ts";

import { Composer, InlineKeyboard } from "grammy/mod.ts";

const composer = new Composer<MyContext>();

// Callback data is client-controlled, so every callback that mutates a chat's
// settings must re-verify that the clicking user is an admin of that chat.
async function checkCallbackPerms(ctx: MyContext, chat: number) {
  const res = await get_perms(ctx, chat, ctx.from?.id ?? 0);
  if (res == null) {
    await ctx.answerCallbackQuery({
      text: ctx.t("no-perms"),
      show_alert: true,
    });
    return false;
  }
  if (!res) {
    await ctx.answerCallbackQuery({
      text: ctx.t("not-admin"),
      show_alert: true,
    });
    return false;
  }
  return true;
}

function settingsKeyboard(ctx: MyContext, chat: number | string) {
  return new InlineKeyboard()
    .text(ctx.t("btn-approve"), `approve_${chat}`).row()
    .text(ctx.t("btn-disapprove"), `decline_${chat}`).row()
    .text(ctx.t("btn-custom"), `welcome_${chat}`);
}

async function settingsHandler(ctx: MyContext, chat: number, user: number) {
  const res = await get_perms(ctx, chat, user);
  if (res == null) {
    return await ctx.reply(
      ctx.t("no-perms"),
    );
  }
  if (!res) return await ctx.reply(ctx.t("not-admin"));
  const chatInfo = await ctx.api.getChat(chat);
  if (chatInfo.type == "private") return;
  // remember chat + verified admin so the web dashboard can list it
  Promise.all([
    upsertChat({
      chatID: chat,
      title: chatInfo.title,
      username: "username" in chatInfo ? chatInfo.username : undefined,
      type: chatInfo.type,
    }),
    addAdmin(chat, user),
  ]).catch((err) => console.warn("Chat registry write failed:", err.message));
  const current_settings = await getSettings(chat);
  const autoappr = current_settings?.status ?? true;
  await ctx.reply(
    ctx.t("chat-settings", {
      title: chatInfo.title,
      autoappr: autoappr.toString(),
    }),
    {
      reply_markup: settingsKeyboard(ctx, chat),
      parse_mode: "Markdown",
    },
  );
  const tempRemoveKbd = await ctx.reply("Removing keyboard..", {
    reply_markup: { remove_keyboard: true },
  });
  await tempRemoveKbd.delete();
}

// custom welcome input, requested via the "Custom Welcome Message" button
composer
  .chatType("private")
  .filter((ctx) =>
    ctx.session.awaitingWelcomeFor != undefined &&
    ctx.msg?.text != undefined &&
    !ctx.msg.text.startsWith("/") &&
    ctx.msg.forward_origin == undefined
  )
  .on("message:text", async (ctx) => {
    const chatID = ctx.session.awaitingWelcomeFor!;
    ctx.session.awaitingWelcomeFor = undefined;
    if (!(await get_perms(ctx, chatID, ctx.from.id))) {
      return await ctx.reply(ctx.t("not-admin"));
    }
    await setWelcome(chatID, ctx.msg.text);
    await ctx.reply(ctx.t("welcome-set", { msg: ctx.msg.text }), {
      reply_markup: new InlineKeyboard().text(
        "« Back",
        `settings_page_${chatID}`,
      ),
    });
  });

composer
  .chatType("private")
  .filter((ctx) =>
    !ctx.msg?.text?.startsWith("/") &&
    ctx.msg?.forward_origin?.type == "channel"
  )
  .on("message", async (ctx) => {
    const origin = ctx.msg?.forward_origin;
    if (origin?.type != "channel") return;
    await settingsHandler(ctx, origin.chat.id, ctx.from?.id ?? 0);
  });

composer.on(":chat_shared", async (ctx) => {
  const chat = ctx.update.message?.chat_shared.chat_id;
  if (chat == undefined) return;
  await settingsHandler(ctx, chat, ctx.from?.id ?? 0);
});

composer.callbackQuery(/settings_page_(.*)/, async (ctx) => {
  const chat = ctx.match?.[1];
  if (chat == undefined) return;
  if (!(await checkCallbackPerms(ctx, Number(chat)))) return;
  // cancel a pending "send me the welcome message" prompt, if any
  ctx.session.awaitingWelcomeFor = undefined;
  const chatInfo = await ctx.api.getChat(Number(chat));
  if (chatInfo.type == "private") return;
  const current_settings = await getSettings(Number(chat));
  const autoappr = current_settings?.status ?? true;
  await ctx.editMessageText(
    ctx.t("chat-settings", {
      title: chatInfo.title,
      autoappr: autoappr.toString(),
    }),
    {
      reply_markup: settingsKeyboard(ctx, chat),
      parse_mode: "Markdown",
    },
  );
  await ctx.answerCallbackQuery();
});

composer.callbackQuery(/approve_(.*)/, async (ctx) => {
  const chatID = ctx.match?.[1];
  if (chatID == undefined) return;
  if (!(await checkCallbackPerms(ctx, Number(chatID)))) return;
  await setStatus(Number(chatID), true);
  const chatInfo = await ctx.api.getChat(Number(chatID));
  if (chatInfo.type == "private") return;
  await ctx.editMessageText(
    ctx.t("chat-settings-approved", { title: chatInfo.title }),
    {
      reply_markup: new InlineKeyboard().text(
        "« Back",
        `settings_page_${chatID}`,
      ),
    },
  );
  await ctx.answerCallbackQuery();
});

composer.callbackQuery(/decline_(.*)/, async (ctx) => {
  const chatID = ctx.match?.[1];
  if (chatID == undefined) return;
  if (!(await checkCallbackPerms(ctx, Number(chatID)))) return;
  await setStatus(Number(chatID), false);
  const chatInfo = await ctx.api.getChat(Number(chatID));
  if (chatInfo.type == "private") return;
  await ctx.editMessageText(
    ctx.t("chat-settings-disapproved", { title: chatInfo.title }),
    {
      reply_markup: new InlineKeyboard().text(
        "« Back",
        `settings_page_${chatID}`,
      ),
    },
  );
  await ctx.answerCallbackQuery();
});

composer.callbackQuery(/welcome_(.*)/, async (ctx) => {
  const chatID = ctx.match?.[1];
  if (chatID == undefined) return;
  if (!(await checkCallbackPerms(ctx, Number(chatID)))) return;
  ctx.session.awaitingWelcomeFor = Number(chatID);
  await ctx.editMessageText(ctx.t("welcome-text"), {
    reply_markup: new InlineKeyboard().text(
      "« Back",
      `settings_page_${chatID}`,
    ),
  });
  await ctx.answerCallbackQuery();
});

export default composer;
