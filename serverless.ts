import { serve } from "server";
import { webhookCallback } from "grammy/mod.ts";
import { bot } from "./bot.ts";

serve(webhookCallback(bot, "std/http"));
