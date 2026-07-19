import { MyContext } from "../core/types.ts";
import helperClass from "../helpers/baseHelpers.ts";

import { Composer, GrammyError } from "grammy/mod.ts";
import { countUsers, users } from "../database/usersDb.ts";
import { countSettings } from "../database/welcomeDb.ts";

const composer = new Composer<MyContext>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      `<b>Stats for @${ctx.me.username}</b>

<b>Total users</b>: ${await countUsers()}
<b>Chats with modified settings</b>: ${await countSettings()}
<b>Total Users Seen (Approved/Disapproved)</b>: ${helperClass.TOTAL_USERS_SEEN}
<b>Uptime</b>: ${uptime}

<b><a href="https://github.com/xditya/ChannelActionsBot">Repository</a> | <a href="https://t.me/BotzHub">Channel</a> | <a href="https://t.me/BotzHubChat">Support</a></b>`,
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
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
    let done = 0, blocked = 0;
    const reply = await ctx.reply("Please wait, in progress...");
    const isReply = ctx.message?.reply_to_message;
    if (!isReply) {
      return await ctx.api.editMessageText(
        ctx.chat.id,
        reply.message_id,
        "Please reply to a message to broadcast.",
      );
    }

    // use a cursor to avoid memory issues
    // and maybe prevent broadcast from
    // blocking the main process

    for await (const { userID } of users.find()) {
      let attempts = 0;
      while (attempts < 2) {
        attempts++;
        try {
          await ctx.api.copyMessage(userID, ctx.chat.id, isReply.message_id, {
            reply_markup: isReply.reply_markup,
          });
          done++;
          break;
        } catch (err) {
          if (err instanceof GrammyError) {
            const retryAfter = err.parameters?.retry_after;
            if (retryAfter != undefined && attempts < 2) {
              await ctx.api.editMessageText(
                ctx.chat.id,
                reply.message_id,
                `Sleeping for ${retryAfter} seconds due to a floodwait.\n\nBroadcast completed to ${done}/${totalUsers} users, of which ${blocked} blocked the bot.`,
              );
              await sleep((retryAfter + 1) * 1000);
              continue;
            }
            if (err.error_code == 403 || err.error_code == 400) {
              blocked++;
              break;
            }
          }
          console.log(
            `Failed to send message to ${userID}. Error: ${
              err instanceof Error ? err.message : err
            }`,
          );
          break;
        }
      }
      if (done > 0 && done % 100 == 0) {
        await ctx.api.editMessageText(
          ctx.chat.id,
          reply.message_id,
          `Broadcast done to ${done}/${totalUsers} users, of which ${blocked} blocked the bot.\n\nStill in progress...`,
        );
      }
      // stay well below telegram's ~30 msg/s bot-wide limit
      await sleep(50);
    }
    await ctx.api.editMessageText(
      ctx.chat.id,
      reply.message_id,
      `Broadcast completed.

Total users: ${totalUsers}
Sent to: ${done}
Blocked: ${blocked}
Failed for unknown reason: ${totalUsers - done - blocked}`,
    );
  });

export default composer;
