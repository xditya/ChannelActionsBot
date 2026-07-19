import { db } from "./connect.ts";
import {
  ChatStatsDailySchema,
  CounterSchema,
  StatsDailySchema,
} from "../core/interfaces.ts";

const statsDaily = db.collection<StatsDailySchema>("STATS_DAILY");
const chatStatsDaily = db.collection<ChatStatsDailySchema>("CHAT_STATS_DAILY");
const counters = db.collection<CounterSchema>("COUNTERS");

// (chat, day) docs expire 30 days after creation; the TTL monitor
// deletes them, so per-chat daily stats stay permanently bounded.
chatStatsDaily
  .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  .catch((err) =>
    console.warn("Could not create TTL index on CHAT_STATS_DAILY:", err.message)
  );
chatStatsDaily
  .createIndex({ chatID: 1, date: 1 }, { unique: true })
  .catch((err) =>
    console.warn("Could not create index on CHAT_STATS_DAILY:", err.message)
  );

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function recordJoinAction(chatID: number, approved: boolean) {
  const date = today();
  const inc = approved ? { approved: 1 } : { declined: 1 };
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await Promise.all([
    statsDaily.updateOne({ _id: date }, { $inc: inc }, { upsert: true }),
    chatStatsDaily.updateOne(
      { chatID, date },
      { $inc: inc, $setOnInsert: { expiresAt } },
      { upsert: true },
    ),
    counters.updateOne(
      { _id: "global" },
      { $inc: { usersSeen: 1 } },
      { upsert: true },
    ),
  ]);
}

export async function getUsersSeen(): Promise<number> {
  const doc = await counters.findOne({ _id: "global" });
  return doc?.usersSeen ?? 0;
}

export async function getDailyStats(days: number) {
  const since = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  return await statsDaily
    .find({ _id: { $gte: since } })
    .sort({ _id: 1 })
    .toArray();
}

export async function getChatDailyStats(chatID: number, days: number) {
  const since = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  return await chatStatsDaily
    .find({ chatID, date: { $gte: since } })
    .sort({ date: 1 })
    .toArray();
}

export async function getTopChats(days: number, limit: number) {
  const since = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  return await chatStatsDaily.aggregate<{
    _id: number;
    approved: number;
    declined: number;
    chat?: { title?: string; username?: string; type?: string };
  }>([
    { $match: { date: { $gte: since } } },
    {
      $group: {
        _id: "$chatID",
        approved: { $sum: { $ifNull: ["$approved", 0] } },
        declined: { $sum: { $ifNull: ["$declined", 0] } },
      },
    },
    { $sort: { approved: -1, declined: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "CHATS",
        localField: "_id",
        foreignField: "chatID",
        as: "chat",
      },
    },
    { $unwind: { path: "$chat", preserveNullAndEmptyArrays: true } },
  ]).toArray();
}
