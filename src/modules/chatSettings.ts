import { MyContext } from "../core/types.ts";
import { getSettings, setStatus } from "../database/welcomeDb.ts";
import { get_perms } from "../helpers/permChecker.ts";

import { Composer, InlineKeyboard } from "grammy/mod.ts";

const composer = new Composer<MyContext>();

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
  const current_settings = await getSettings(chat);
  let autoappr;
  if (current_settings == null) autoappr = true;
  else autoappr = current_settings.status ?? true;
  const settings_buttons = new InlineKeyboard()
    .text(ctx.t("btn-approve"), `approve_${chat}`).row()
    .text(ctx.t("btn-disapprove"), `decline_${chat}`).row()
    .text(ctx.t("btn-custom"), `welcome_${chat}`);
  await ctx.reply(
    ctx.t("chat-settings", {
      title: chatInfo.title,
      autoappr: autoappr.toString(),
    }),
    {
      reply_markup: settings_buttons,
      parse_mode: "Markdown",
    },
  );
  const tempRemoveKbd = await ctx.reply("Removing keyboard..", {
    reply_markup: { remove_keyboard: true },
  });
  await tempRemoveKbd.delete();
}
composer
  .chatType("private")
  .filter((ctx) =>
    !ctx.msg?.text?.startsWith("/") &&
    ctx.msg?.forward_from_chat?.type == "channel"
  )
  .on("message", async (ctx) => {
    const chat = ctx.msg?.forward_from_chat?.id;
    if (chat == undefined) return;
    await settingsHandler(ctx, chat, ctx.from?.id ?? 0);
  });

composer.on(":chat_shared", async (ctx) => {
  const chat = ctx.update.message?.chat_shared.chat_id;
  if (chat == undefined) return;
  await settingsHandler(ctx, chat, ctx.from?.id ?? 0);
});

composer.callbackQuery(/settings_page_(.*)/, async (ctx) => {
  const chat = ctx.match?.[1];
  if (chat == undefined) return;
  const chatInfo = await ctx.api.getChat(Number(chat));
  if (chatInfo.type == "private") return;
  const current_settings = await getSettings(Number(chat));
  let autoappr;
  if (current_settings == null) autoappr = true;
  else autoappr = current_settings.status ?? true;
  const settings_buttons = new InlineKeyboard()
    .text(ctx.t("btn-approve"), `approve_${chat}`).row()
    .text(ctx.t("btn-disapprove"), `decline_${chat}`).row()
    .text(ctx.t("btn-custom"), `welcome_${chat}`);
  await ctx.editMessageText(
    ctx.t("chat-settings", {
      title: chatInfo.title,
      autoappr: autoappr.toString(),
    }),
    {
      reply_markup: settings_buttons,
      parse_mode: "Markdown",
    },
  );
});

composer.callbackQuery(/approve_(.*)/, async (ctx) => {
  const chatID = ctx.match?.[1];
  if (chatID == undefined) return;
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
});

composer.callbackQuery(/decline_(.*)/, async (ctx) => {
  const chatID = ctx.match?.[1];
  if (chatID == undefined) return;
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
});

composer.callbackQuery(/welcome_(.*)/, async (ctx) => {
  await ctx.conversation.enter("inputWelcomeMsg");
});

export default composer;
