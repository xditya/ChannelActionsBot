import { MyContext } from "./bot.ts";
import { Api, Bot, RawApi } from "grammy/mod.ts";

export async function get_perms(
  bot: Bot<MyContext, Api<RawApi>>,
  chat: number,
  user: number,
) {
  try {
    const stats = await bot.api.getChatMember(chat, user);
    if (stats.status == "administrator" || stats.status == "creator") {
      return true;
    } else return false;
  } catch (error) {
    if (error.error_code == 400) return null;
    console.error(error);
    return null;
  }
}
