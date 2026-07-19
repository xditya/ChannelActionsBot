import config from "$env";
import { MongoClient } from "mongodb";

console.log("Connecting to MongoDB...");
const client = new MongoClient(config.MONGO_URL);
try {
  await client.connect();
} catch (err) {
  console.error("Error connecting to MongoDB", err);
  throw err;
}

export const db = client.db("ChannelActions");
