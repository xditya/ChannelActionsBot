import config from "./env.ts";
import { MongoClient, ObjectId } from "mongo";

console.log("Connecting to MongoDB...");
const client = new MongoClient();
let MONGO_URL = config.MONGO_URL;
if (!MONGO_URL.endsWith("authMechanism=SCRAM-SHA-1")) {
  MONGO_URL += "&authMechanism=SCRAM-SHA-1";
}
try {
  await client.connect(MONGO_URL);
} catch (err) {
  console.error("Error connecting to MongoDB", err);
  throw err;
}

interface UserSchema {
  _id: ObjectId;
  userID: number;
}

const db = client.database("ChannelActions");
const users = db.collection<UserSchema>("BOTUSERS");

export async function addUser(userId: number) {
  const user = await users.findOne({ userID: userId });
  if (user) return;
  await users.insertOne({ userID: userId });
}

export async function removeUser(userId: number) {
  const user = await users.findOne({ userID: userId });
  if (!user) return;
  await users.deleteOne({ userID: userId });
}

export async function getUsers() {
  const all_users = await users.find({ userID: { $ne: 0 } }).toArray();
  const userlist = [];
  for (const user of all_users) {
    userlist.push(user.userID);
  }
  return userlist;
}

export async function countUsers() {
  const count = await users.countDocuments({ userID: { $ne: 0 } });
  return count;
}

export async function addAll(usrs: number[]) {
  const a = [];
  for (const user of usrs) {
    a.push({ userID: user });
  }
  await users.insertMany(a);
}

interface SettingsSchema {
  _id: ObjectId;
  chatID: number;
  status: boolean;
  welcome: string;
}

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
