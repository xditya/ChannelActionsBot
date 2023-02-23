import config from "$env";
import { MongoClient } from "mongo";

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

export const db = client.database("ChannelActions");
