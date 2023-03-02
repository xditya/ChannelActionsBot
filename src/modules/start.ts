import { MyContext } from "../core/types.ts";
import { addUser } from "../database/usersDb.ts";

import { Composer, InlineKeyboard } from "grammy/mod.ts";

const composer = new Composer<MyContext>();

composer
  .command("start", async (ctx) => {
    if (ctx.chat.type != "private" && ctx.match == "by_BotzHub") {
      await ctx.reply("Continue setting me up in PM!", {
        reply_markup: new InlineKeyboard().url(
          "Continue",
          `https://t.me/${ctx.me.username}`,
        ),
      });
      return;
    }
    if (ctx.chat.type != "private") return;
    await ctx.reply(ctx.t("start-msg", { user: ctx.from!.first_name }), {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text(ctx.t("usage-help"), "helper")
        .text("Language 🌐", "setLang").row()
        .url(ctx.t("updates"), "https://t.me/BotzHub"),
      disable_web_page_preview: true,
    });
    await addUser(ctx.from!.id);
  });

composer.callbackQuery("mainMenu", async (ctx) => {
  await ctx.editMessageText(
    ctx.t("start-msg", { user: ctx.from!.first_name }),
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text(ctx.t("usage-help"), "helper")
        .text("Language 🌐", "setLang").row()
        .url(ctx.t("updates"), "https://t.me/BotzHub"),
      disable_web_page_preview: true,
    },
  );
});

export default composer;
