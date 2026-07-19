import { SessionData } from "./interfaces.ts";

import { Context, SessionFlavor } from "grammy/mod.ts";
import { HydrateFlavor } from "hydrate";
import { I18nFlavor } from "i18n";

export type MyContext = HydrateFlavor<
  Context & SessionFlavor<SessionData> & I18nFlavor
>;
