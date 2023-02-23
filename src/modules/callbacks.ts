import { MyContext } from "../core/types.ts";
import { getSettings, setStatus } from "../database/welcomeDb.ts";
import { getAvaialableLocalesButtons } from "../helpers/functions.ts";

import { Composer, InlineKeyboard } from "grammy/mod.ts";
import { getLanguageInfo } from "language";

const composer = new Composer<MyContext>();

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
composer.callbackQuery("helper", async (ctx) => {
  await ctx.editMessageText(
    ctx.t("help") +
      "\n\nTo approve members who are already in waiting list, upgrade to premium! Contact @xditya_bot for information on pricing.",
    {
      reply_markup: new InlineKeyboard().text(
        "Main Menu 📭",
        "cancelLocaleSetting",
      ),
      parse_mode: "HTML",
    },
  );
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
        "Back",
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
        "Back",
        `settings_page_${chatID}`,
      ),
    },
  );
});

composer.callbackQuery(/welcome_(.*)/, async (ctx) => {
  await ctx.conversation.enter("inputWelcomeMsg");
});

composer
  .callbackQuery("setLang", async (ctx) => {
    const currentLocale = ctx.session?.__language_code ?? "en";
    const keyboard = getAvaialableLocalesButtons(currentLocale);
    await ctx.editMessageText("Please select the language you want to use:", {
      reply_markup: keyboard,
    });
  });

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

export default composer;
