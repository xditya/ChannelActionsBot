import { db } from "./connect.ts";
import { SettingsSchema } from "../core/interfaces.ts";

const settings = db.collection<SettingsSchema>("CHAT_SETTINGS");

export async function setWelcome(chatID: number, welcome: string) {
  const chat = await settings.findOne({ chatID: chatID });
  if (!chat) {
    await settings.insertOne({
      chatID: chatID,
      status: true,
      welcome: welcome,
    });
    return;
  }
  await settings.updateOne({ chatID: chatID }, { $set: { welcome: welcome } });
}

export async function setStatus(chatID: number, status: boolean) {
  const chat = await settings.findOne({ chatID: chatID });
  if (!chat) {
    await settings.insertOne({ chatID: chatID, status: status, welcome: "" });
    return;
  }
  await settings.updateOne({ chatID: chatID }, { $set: { status: status } });
}

export async function getSettings(chatID: number) {
  const chatsetting = await settings.find({ chatID: chatID }).toArray();
  return chatsetting[0] ?? null;
}

export async function getAllSettings() {
  const chatsetting = await settings.find({}).toArray();
  return chatsetting;
}
