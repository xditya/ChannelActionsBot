import { MyContext } from "../core/types.ts";

import { GrammyError } from "grammy/mod.ts";

export async function get_perms(
  ctx: MyContext,
  chat: number,
  user: number,
) {
  try {
    const stats = await ctx.api.getChatMember(chat, user);
    return stats.status == "administrator" || stats.status == "creator";
  } catch (error) {
    if (error instanceof GrammyError && error.error_code == 400) return null;
    console.error(error);
    return null;
  }
}
