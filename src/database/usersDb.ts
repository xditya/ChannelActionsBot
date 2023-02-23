import { db } from "./connect.ts";
import { UserSchema } from "../core/interfaces.ts";

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
