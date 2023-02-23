import { MyContext } from "../core/types.ts";
import { getSettings } from "../database/welcomeDb.ts";
import { get_perms } from "../helpers/permChecker.ts";

import { Composer, InlineKeyboard } from "grammy/mod.ts";

const composer = new Composer<MyContext>();

composer
  .chatType("private")
  .filter((ctx) =>
    !ctx.msg?.text?.startsWith("/") &&
    ctx.msg?.forward_from_chat?.type == "channel"
  )
  .on("message", async (ctx) => {
    const chat = ctx.msg?.forward_from_chat?.id;
    if (chat == undefined) return;
    const res = await get_perms(ctx, chat, ctx.from.id);
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
  });

export default composer;
