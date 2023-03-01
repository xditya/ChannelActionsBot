import { MyContext, MyConversation } from "../core/types.ts";
import { setWelcome } from "../database/welcomeDb.ts";

import { InlineKeyboard } from "grammy/mod.ts";

export async function inputWelcomeMsg(
  conversation: MyConversation,
  ctx: MyContext,
) {
  const chatID = ctx.match?.[1];
  if (chatID == undefined) return;
  await ctx.editMessageText(
    ctx.t("welcome-text"),
  );
  const { message } = await conversation.waitFor("message:text");
  if (!message.text) {
    return await ctx.reply(ctx.t("provide-msg"), {
      reply_markup: new InlineKeyboard().text(
        "« Back",
        `settings_page_${chatID}`,
      ),
    });
  }
  await setWelcome(Number(chatID), message.text);
  await ctx.reply(ctx.t("welcome-set", { msg: message.text }), {
    reply_markup: new InlineKeyboard().text(
      "Back",
      `settings_page_${chatID}`,
    ),
  });
}
