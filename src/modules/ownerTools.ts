import { MyContext } from "../core/types.ts";
import helperClass from "../helpers/baseHelpers.ts";

import { Composer } from "grammy/mod.ts";
import { countUsers, users } from "../database/usersDb.ts";
import { getAllSettings } from "../database/welcomeDb.ts";

const composer = new Composer<MyContext>();

composer
  .filter((ctx) => helperClass.OWNERS.includes(ctx.from?.id ?? 0))
  .chatType("private")
  .command("stats", async (ctx) => {
    const reply = await ctx.reply("Calculating...");
    const diffTime = Math.abs(new Date().valueOf() - helperClass.START_TIME);
    let days = diffTime / (24 * 60 * 60 * 1000);
    let hours = (days % 1) * 24;
    let minutes = (hours % 1) * 60;
    let secs = (minutes % 1) * 60;
    [days, hours, minutes, secs] = [
      Math.floor(days),
      Math.floor(hours),
      Math.floor(minutes),
      Math.floor(secs),
    ];
    let uptime = "";
    if (days > 0) uptime += `${days}d `;
    if (hours > 0) uptime += `${hours}h `;
    if (minutes > 0) uptime += `${minutes}m `;
    if (secs > 0) uptime += `${secs}s.`;
    await ctx.api.editMessageText(
      ctx.from.id,
      reply.message_id,
      `<b>Stats for @${(await ctx.api.getMe()).username}</b>
      
<b>Total users</b>: ${await countUsers()}
<b>Chats with modified settings</b>: ${(await getAllSettings()).length}
<b>Total Users Seen (Approved/Disapproved)</b>: ${helperClass.TOTAL_USERS_SEEN}
<b>Uptime</b>: ${uptime}

<b><a href="https://github.com/xditya/ChannelActionsBot">Repository</a> | <a href="https://t.me/BotzHub">Channel</a> | <a href="https://t.me/BotzHubChat">Support</a></b>`,
      { parse_mode: "HTML", disable_web_page_preview: true },
    );
  });

composer
  .filter((ctx) => helperClass.OWNERS.includes(ctx.from?.id ?? 0))
  .chatType("private")
  .command("broadcast", async (ctx) => {
    if (Deno.env.get("DENO_DEPLOYMENT_ID") != undefined) {
      return await ctx.reply(
        "This command cannot be used on deno deploy, due to the low CPU response time. Run the bot on a server instead.",
      );
    }
    const totalUsers = await countUsers();
    let done = 0;
    const reply = await ctx.reply("Please wait, in progress...");
    const isReply = await ctx.message?.reply_to_message;
    if (!isReply) {
      return await ctx.api.editMessageText(
        ctx.chat!.id,
        reply.message_id,
        "Please reply to a message to broadcast.",
      );
    }

    // use curosr to avoid memory issues
    // and maybe prevent broadcast from
    // blocking the main process
    const cursor = users.find();
    for await (const { userID } of cursor) {
      try {
        await ctx.api.copyMessage(userID, ctx.chat!.id, isReply.message_id, {
          reply_markup: isReply.reply_markup,
        });
        done++;
      } catch (err) {
        console.log(
          `Failed to send message to ${userID}. Error: ${err.message}`,
        );
      }
      if (done % 100 == 0) {
        await ctx.api.editMessageText(
          ctx.chat!.id,
          reply.message_id,
          "Broadcast is still in progress. Sent to " + done + "/" +
            totalUsers +
            "users.",
        );
      }
    }
    await ctx.api.editMessageText(
      ctx.chat!.id,
      reply.message_id,
      "Broadcast complete. Sent to " + done + "/" + totalUsers + "users.",
    );
  });

export default composer;
