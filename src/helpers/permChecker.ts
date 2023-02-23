import { MyContext } from "../core/types.ts";

export async function get_perms(
  ctx: MyContext,
  chat: number,
  user: number,
) {
  try {
    const stats = await ctx.api.getChatMember(chat, user);
    if (stats.status == "administrator" || stats.status == "creator") {
      return true;
    } else return false;
  } catch (error) {
    if (error.error_code == 400) return null;
    console.error(error);
    return null;
  }
}
