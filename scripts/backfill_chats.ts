/*
One-time backfill: populate the CHATS registry and ADMINS mapping for every
chat that configured the bot before the dashboard existed.

For each chat in CHAT_SETTINGS it fetches the chat info and current admin
list from Telegram (2 API calls per chat, throttled to stay well under
Telegram's rate limits) and stores them, so all existing chats and their
admins appear in the web dashboard immediately.

Run once, with the production BOT_TOKEN in .env:
  deno task backfill

Safe to re-run: it simply refreshes titles and admin lists. Chats the bot
was removed from are skipped and counted.
*/

import config from "$env";
import { db } from "../src/database/connect.ts";
import { replaceAdmins, upsertChat } from "../src/database/chatsDb.ts";
import { SettingsSchema } from "../src/core/interfaces.ts";

import { Api, GrammyError } from "grammy/mod.ts";

const api = new Api(config.BOT_TOKEN);
const settings = db.collection<SettingsSchema>("CHAT_SETTINGS");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Call fn, sleeping out floodwaits (up to 3 attempts). */
async function withFloodwait<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryAfter = err instanceof GrammyError
        ? err.parameters?.retry_after
        : undefined;
      if (retryAfter === undefined || attempt >= 3) throw err;
      console.log(`  floodwait: sleeping ${retryAfter}s`);
      await sleep((retryAfter + 1) * 1000);
    }
  }
}

const total = await settings.countDocuments();
console.log(`Backfilling ${total} chats...`);

let done = 0, synced = 0, gone = 0, failed = 0;
const startedAt = Date.now();

for await (const { chatID } of settings.find({}, { projection: { chatID: 1 } })) {
  done++;
  try {
    const info = await withFloodwait(() => api.getChat(chatID));
    if (info.type !== "private") {
      await upsertChat({
        chatID,
        title: info.title,
        username: "username" in info ? info.username : undefined,
        type: info.type,
      });
      const members = await withFloodwait(() =>
        api.getChatAdministrators(chatID)
      );
      await replaceAdmins(
        chatID,
        members.filter((m) => !m.user.is_bot).map((m) => m.user.id),
      );
      synced++;
    }
  } catch (err) {
    if (
      err instanceof GrammyError &&
      (err.error_code === 400 || err.error_code === 403)
    ) {
      gone++; // chat deleted, or bot kicked/demoted — nothing to register
    } else {
      failed++;
      console.warn(
        `  ${chatID}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
  if (done % 100 === 0) {
    const rate = done / ((Date.now() - startedAt) / 1000);
    const etaMin = Math.round((total - done) / rate / 60);
    console.log(
      `${done}/${total} — synced ${synced}, gone ${gone}, failed ${failed} (~${etaMin} min left)`,
    );
  }
  await sleep(120); // ~8 chats/s => ~16 API calls/s, well under limits
}

console.log(`
Backfill complete.
  Chats checked:   ${done}
  Admins synced:   ${synced}
  Gone/kicked:     ${gone}
  Other failures:  ${failed}`);
Deno.exit(0);
