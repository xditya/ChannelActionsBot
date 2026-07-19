import { db } from "./connect.ts";
import { AdminSchema, ChatSchema } from "../core/interfaces.ts";

import type { Api } from "grammy/mod.ts";

const chats = db.collection<ChatSchema>("CHATS");
const admins = db.collection<AdminSchema>("ADMINS");

chats.createIndex({ chatID: 1 }, { unique: true }).catch((err) =>
  console.warn("Could not create index on CHATS:", err.message)
);
admins.createIndex({ chatID: 1, userID: 1 }, { unique: true }).catch((err) =>
  console.warn("Could not create index on ADMINS:", err.message)
);
admins.createIndex({ userID: 1 }).catch((err) =>
  console.warn("Could not create userID index on ADMINS:", err.message)
);

export async function upsertChat(info: {
  chatID: number;
  title?: string;
  username?: string;
  type: string;
}) {
  await chats.updateOne(
    { chatID: info.chatID },
    {
      $set: {
        title: info.title ?? "",
        username: info.username ?? null,
        type: info.type,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function removeChat(chatID: number) {
  await Promise.all([
    chats.deleteOne({ chatID }),
    admins.deleteMany({ chatID }),
  ]);
}

export async function addAdmin(chatID: number, userID: number) {
  await admins.updateOne(
    { chatID, userID },
    { $setOnInsert: { chatID, userID } },
    { upsert: true },
  );
}

export async function replaceAdmins(chatID: number, userIDs: number[]) {
  await admins.deleteMany({ chatID });
  if (userIDs.length > 0) {
    await admins.insertMany(
      userIDs.map((userID) => ({ chatID, userID })),
      { ordered: false },
    );
  }
}

export async function hasAdmins(chatID: number): Promise<boolean> {
  return (await admins.countDocuments({ chatID }, { limit: 1 })) > 0;
}

/** Replace the stored admin list of a chat with the live one from Telegram. */
export async function syncAdmins(api: Api, chatID: number) {
  try {
    const members = await api.getChatAdministrators(chatID);
    const userIDs = members
      .filter((m) => !m.user.is_bot)
      .map((m) => m.user.id);
    await replaceAdmins(chatID, userIDs);
    return userIDs.length;
  } catch (err) {
    console.warn(
      `Could not sync admins for ${chatID}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/** Chats a user administers, joined with their settings. */
export async function getChatsForUser(userID: number) {
  return await admins.aggregate<{
    chatID: number;
    chat?: { title?: string; username?: string | null; type?: string };
    settings?: { status?: boolean; welcome?: string };
  }>([
    { $match: { userID } },
    {
      $lookup: {
        from: "CHATS",
        localField: "chatID",
        foreignField: "chatID",
        as: "chat",
      },
    },
    { $unwind: "$chat" },
    {
      $lookup: {
        from: "CHAT_SETTINGS",
        localField: "chatID",
        foreignField: "chatID",
        as: "settings",
      },
    },
    { $unwind: { path: "$settings", preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, chatID: 1, chat: 1, settings: 1 } },
  ]).toArray();
}

export async function getChat(chatID: number) {
  return await chats.findOne({ chatID });
}

export async function countChats() {
  return await chats.countDocuments();
}
