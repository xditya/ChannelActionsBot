import { MyContext } from "../core/types.ts";
import start from "./start.ts";
import callbacks from "./callbacks.ts";
import chatJoins from "./chatJoins.ts";
import ownerTools from "./ownerTools.ts";
import settings from "./settings.ts";

import { Composer } from "grammy/mod.ts";

const composer = new Composer<MyContext>();

composer.use(
  start,
  callbacks,
  chatJoins,
  ownerTools,
  settings,
);

export default composer;
