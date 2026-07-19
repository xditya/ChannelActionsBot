import { db } from "./connect.ts";

import type { ISession } from "mongo_sessions";

export const sessionsCollection = db.collection<ISession>(
  "sessions",
);
