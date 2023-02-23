import { SessionData } from "./interfaces.ts";

import { Context, SessionFlavor } from "grammy/mod.ts";
import { HydrateFlavor } from "hydrate";
import { type Conversation, type ConversationFlavor } from "conversations";
import { I18nFlavor } from "i18n";

export type MyContext = HydrateFlavor<
  Context & SessionFlavor<SessionData> & I18nFlavor & ConversationFlavor
>;

export type MyConversation = Conversation<MyContext>;
