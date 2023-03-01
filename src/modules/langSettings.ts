import { getAvaialableLocalesButtons } from "../helpers/functions.ts";
import { getLanguageInfo } from "language";
import { MyContext } from "../core/types.ts";

import { Composer, InlineKeyboard } from "grammy/mod.ts";

const composer = new Composer<MyContext>();

// language settings
composer.callbackQuery(/setlang_(.*)/, async (ctx) => {
  const locale = ctx.match![1];
  await ctx.i18n.setLocale(locale);
  await ctx.editMessageText(
    `Language set to ${
      getLanguageInfo(locale)?.nativeName ?? locale
    }\n\nUse the buttons to change it again!`,
    { reply_markup: getAvaialableLocalesButtons(locale) },
  );
  await ctx.answerCallbackQuery();
});

composer
  .callbackQuery("setLang", async (ctx) => {
    const currentLocale = ctx.session?.__language_code ?? "en";
    const keyboard = getAvaialableLocalesButtons(currentLocale);
    await ctx.editMessageText("Please select the language you want to use:", {
      reply_markup: keyboard,
    });
  });

composer.callbackQuery(/set_locale_(.*)/, async (ctx) => {
  const i = ctx.match?.[0];
  if (!i || i == undefined) return;
  await ctx.editMessageText(`Locale changed to ${i}`);
  await ctx.i18n.setLocale(i);
});

composer.callbackQuery("cancelLocaleSetting", async (ctx) => {
  await ctx.editMessageText(ctx.t("start-msg", { user: ctx.from.first_name }), {
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard()
      .text(ctx.t("usage-help"), "helper").row()
      .text("Change Language", "setLang").row()
      .url(ctx.t("updates"), "https://t.me/BotzHub"),
    disable_web_page_preview: true,
  });
});

export default composer;
