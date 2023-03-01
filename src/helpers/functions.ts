import i18n from "../core/i18n.ts";

import { InlineKeyboard } from "grammy/mod.ts";
import { getLanguageInfo } from "language";

export function getAvaialableLocalesButtons(currentLocale: string) {
  const keyboard = new InlineKeyboard();
  let c = 1;
  for (const locale of i18n.locales) {
    let localName = getLanguageInfo(locale)?.nativeName ?? locale;
    if (locale === currentLocale) {
      localName += " ✅";
    }
    keyboard.text(localName, `setlang_${locale}`);
    c += 1;
    if (c == 2) {
      keyboard.row();
      c = 0;
    }
  }
  return keyboard.row().text("« Back", "mainMenu");
}
