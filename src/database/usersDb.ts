import { db } from "./connect.ts";
import { UserSchema } from "../core/interfaces.ts";

export const users = db.collection<UserSchema>("BOTUSERS");

users.createIndex({ userID: 1 }, { unique: true }).catch((err) =>
  console.warn("Could not create index on BOTUSERS:", err.message)
);

export async function addUser(userId: number) {
  await users.updateOne(
    { userID: userId },
    { $setOnInsert: { userID: userId } },
    { upsert: true },
  );
}

export async function countUsers() {
  return await users.countDocuments({ userID: { $ne: 0 } });
}
