import { MyContext } from "../core/types.ts";
import start from "./start.ts";
import help from "./help.ts";
import chatSettings from "./chatSettings.ts";
import langSettings from "./langSettings.ts";
import chatJoins from "./chatJoins.ts";
import ownerTools from "./ownerTools.ts";

import { Composer } from "grammy/mod.ts";

const composer = new Composer<MyContext>();

composer.use(
  start,
  help,
  chatSettings,
  langSettings,
  chatJoins,
  ownerTools,
);

export default composer;
