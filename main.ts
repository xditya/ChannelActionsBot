/*
ChannelActions Bot
Telegram: @ChannelActionsBot

(c) Aditya, https://xditya.me
*/

import config from "$env";
import composer from "./src/modules/mod.ts";
import { MyContext } from "./src/core/types.ts";
import { sessionsCollection } from "./src/database/sessionsDb.ts";
import i18n from "./src/core/i18n.ts";

import {
  Bot,
  GrammyError,
  HttpError,
  session,
  webhookCallback,
} from "grammy/mod.ts";
import { autoQuote } from "autoQuote";
import { hydrate } from "hydrate";
import { MongoDBAdapter } from "mongo_sessions";
import { run } from "grammy_runner";

import { createWebApp } from "./src/web/server.ts";

await i18n.loadLocalesDir("locales");

// initialize the bot
const bot = new Bot<MyContext>(config.BOT_TOKEN);
await bot.init();

bot.use(hydrate());
bot.use(autoQuote());
bot.use(
  session({
    initial: () => ({}),
    storage: new MongoDBAdapter({ collection: sessionsCollection }),
  }),
);
bot.use(i18n);
bot.use(composer);

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

// install the dashboard as the bot's menu button (mini app)
if (config.WEBAPP_URL) {
  bot.api.setChatMenuButton({
    menu_button: {
      type: "web_app",
      text: "Dashboard",
      web_app: { url: config.WEBAPP_URL },
    },
  }).catch((err) => console.warn("Could not set menu button:", err.message));
}

if (Deno.args[0] == "--polling") {
  console.info(`Started as @${bot.botInfo.username} on long polling.`);

  // we use grammy's runner for concurrency
  // basically, on local hosts, for broadcast plugin
  // to work without killing the main bot process.

  const runner = run(bot, {
    runner: {
      fetch: {
        allowed_updates: [
          "chat_join_request",
          "message",
          "callback_query",
          "my_chat_member",
        ],
      },
    },
  });
  const stopRunner = () => {
    if (runner.isRunning()) runner.stop();
  };
  Deno.addSignalListener("SIGINT", stopRunner);
  if (Deno.build.os != "windows") {
    Deno.addSignalListener("SIGTERM", stopRunner);
  }

  const web = createWebApp({ botUsername: bot.botInfo.username });
  Deno.serve({ port: config.PORT }, web.fetch);
} else {
  console.info(`Started as @${bot.botInfo.username} on webhooks.`);

  const web = createWebApp({
    botUsername: bot.botInfo.username,
    webhookPath: `/${bot.token}`,
    webhookHandler: webhookCallback(bot, "std/http"),
  });
  Deno.serve({ port: config.PORT }, web.fetch);
}

export default bot;
