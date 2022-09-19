import { bot } from "./bot.ts";

bot.start({
  drop_pending_updates: true,
  allowed_updates: ["chat_join_request", "message", "callback_query"],
});

Deno.addSignalListener("SIGINT", () => bot.stop());
Deno.addSignalListener("SIGTERM", () => bot.stop());
