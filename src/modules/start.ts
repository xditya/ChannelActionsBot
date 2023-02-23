import { MyContext } from "../core/types.ts";
import { addUser } from "../database/usersDb.ts";

import { Composer, InlineKeyboard } from "grammy/mod.ts";

const composer = new Composer<MyContext>();

composer
  .chatType("private")
  .command("start", async (ctx) => {
    await ctx.reply(ctx.t("start-msg", { user: ctx.from.first_name }), {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text(ctx.t("usage-help"), "helper").row()
        .text("Change Language", "setLang").row()
        .url(ctx.t("updates"), "https://t.me/BotzHub"),
      disable_web_page_preview: true,
    });
    await addUser(ctx.from.id);
  });

export default composer;
