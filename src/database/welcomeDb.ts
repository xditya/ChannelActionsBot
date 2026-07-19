import { db } from "./connect.ts";
import { SettingsSchema } from "../core/interfaces.ts";

const settings = db.collection<SettingsSchema>("CHAT_SETTINGS");

settings.createIndex({ chatID: 1 }, { unique: true }).catch((err) =>
  console.warn("Could not create index on CHAT_SETTINGS:", err.message)
);

export async function setWelcome(chatID: number, welcome: string) {
  await settings.updateOne(
    { chatID: chatID },
    { $set: { welcome: welcome }, $setOnInsert: { status: true } },
    { upsert: true },
  );
}

export async function setStatus(chatID: number, status: boolean) {
  await settings.updateOne(
    { chatID: chatID },
    { $set: { status: status }, $setOnInsert: { welcome: "" } },
    { upsert: true },
  );
}

export async function getSettings(chatID: number) {
  return await settings.findOne({ chatID: chatID });
}

export async function countSettings() {
  return await settings.countDocuments();
}
