import config from "$env";
import {
  type AuthedUser,
  issueSessionToken,
  validateInitData,
  validateLoginWidget,
  verifySessionToken,
} from "./auth.ts";
import { getSettings, setStatus, setWelcome } from "../database/welcomeDb.ts";
import {
  addAdmin,
  countChats,
  getChat,
  getChatsForUser,
  syncAdmins,
  upsertChat,
} from "../database/chatsDb.ts";
import { countUsers } from "../database/usersDb.ts";
import { countSettings } from "../database/welcomeDb.ts";
import {
  getChatDailyStats,
  getDailyStats,
  getTopChats,
  getUsersSeen,
} from "../database/statsDb.ts";
import helperClass from "../helpers/baseHelpers.ts";

import { Api } from "grammy/mod.ts";
import { Hono } from "hono";
import { serveStatic } from "hono/deno";

type Env = { Variables: { user: AuthedUser } };

const api = new Api(config.BOT_TOKEN);

// short-lived caches so the dashboard doesn't hammer Telegram or Mongo
const adminCache = new Map<string, { ok: boolean; at: number }>();
const ADMIN_CACHE_MS = 5 * 60 * 1000;
let statsCache: { data: unknown; at: number } | null = null;
const STATS_CACHE_MS = 60 * 1000;

const memberCountCache = new Map<number, { count: number; at: number }>();
const MEMBER_COUNT_CACHE_MS = 5 * 60 * 1000;

async function getMemberCount(chatID: number): Promise<number | null> {
  const hit = memberCountCache.get(chatID);
  if (hit && Date.now() - hit.at < MEMBER_COUNT_CACHE_MS) return hit.count;
  try {
    const count = await api.getChatMemberCount(chatID);
    memberCountCache.set(chatID, { count, at: Date.now() });
    return count;
  } catch {
    return null;
  }
}

/** Resolve chat metadata from the registry, falling back to Telegram. */
async function resolveChat(chatID: number) {
  const registered = await getChat(chatID);
  if (registered) {
    return {
      chatID,
      title: registered.title,
      username: registered.username ?? null,
      type: registered.type,
    };
  }
  try {
    const info = await api.getChat(chatID);
    if (info.type === "private") return null;
    const chat = {
      chatID,
      title: info.title,
      username: "username" in info ? info.username ?? null : null,
      type: info.type,
    };
    await upsertChat({
      chatID,
      title: chat.title,
      username: chat.username ?? undefined,
      type: chat.type,
    });
    return chat;
  } catch {
    return null;
  }
}

async function isChatAdmin(chatID: number, userID: number): Promise<boolean> {
  const key = `${chatID}:${userID}`;
  const hit = adminCache.get(key);
  if (hit && Date.now() - hit.at < ADMIN_CACHE_MS) return hit.ok;
  let ok = false;
  try {
    const member = await api.getChatMember(chatID, userID);
    ok = member.status === "administrator" || member.status === "creator";
  } catch {
    ok = false;
  }
  adminCache.set(key, { ok, at: Date.now() });
  return ok;
}

export interface WebAppOptions {
  botUsername: string;
  webhookPath?: string;
  webhookHandler?: (req: Request) => Response | Promise<Response>;
}

export function createWebApp(opts: WebAppOptions): Hono<Env> {
  const app = new Hono<Env>();

  // Telegram webhook goes first so nothing else can shadow it.
  if (opts.webhookPath && opts.webhookHandler) {
    const handler = opts.webhookHandler;
    app.post(opts.webhookPath, async (c) => {
      try {
        return await handler(c.req.raw);
      } catch (err) {
        console.error("Webhook error:", err);
        return c.body(null, 500);
      }
    });
  }

  app.get("/api/config", (c) => c.json({ botUsername: opts.botUsername }));

  app.post("/api/auth/miniapp", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body.initData !== "string") {
      return c.json({ error: "initData is required" }, 400);
    }
    const user = await validateInitData(body.initData);
    if (!user) return c.json({ error: "Telegram could not verify you. Reopen the app and try again." }, 401);
    return c.json({ token: await issueSessionToken(user), user });
  });

  app.post("/api/auth/widget", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return c.json({ error: "Login payload is required" }, 400);
    }
    const user = await validateLoginWidget(body);
    if (!user) return c.json({ error: "Telegram could not verify this login. Try again." }, 401);
    return c.json({ token: await issueSessionToken(user), user });
  });

  // everything below /api requires a valid session
  app.use("/api/*", async (c, next) => {
    const header = c.req.header("Authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const user = token ? await verifySessionToken(token) : null;
    if (!user) return c.json({ error: "Sign in to continue" }, 401);
    c.set("user", user);
    await next();
  });

  app.get("/api/me", (c) =>
    c.json({
      user: c.get("user"),
      isOwner: helperClass.OWNERS.includes(c.get("user").id),
    }));

  app.get("/api/chats", async (c) => {
    const rows = await getChatsForUser(c.get("user").id);
    return c.json({
      chats: rows.map((r) => ({
        chatID: r.chatID,
        title: r.chat?.title ?? String(r.chatID),
        username: r.chat?.username ?? null,
        type: r.chat?.type ?? "channel",
        status: r.settings?.status ?? true,
        welcomeSet: Boolean(r.settings?.welcome),
      })),
    });
  });

  app.get("/api/chats/:id", async (c) => {
    const chatID = Number(c.req.param("id"));
    if (!Number.isSafeInteger(chatID)) return c.json({ error: "Bad chat id" }, 400);
    const user = c.get("user");
    if (!(await isChatAdmin(chatID, user.id))) {
      return c.json({ error: "You are not an admin of this chat, or the bot was removed from it." }, 403);
    }
    const [settings, chat] = await Promise.all([
      getSettings(chatID),
      resolveChat(chatID),
    ]);
    if (!chat) return c.json({ error: "Chat not found" }, 404);
    await addAdmin(chatID, user.id);
    return c.json({
      chat,
      settings: {
        status: settings?.status ?? true,
        welcome: settings?.welcome ?? "",
      },
    });
  });

  app.get("/api/chats/:id/stats", async (c) => {
    const chatID = Number(c.req.param("id"));
    if (!Number.isSafeInteger(chatID)) return c.json({ error: "Bad chat id" }, 400);
    const user = c.get("user");
    if (!(await isChatAdmin(chatID, user.id))) {
      return c.json({ error: "You are not an admin of this chat, or the bot was removed from it." }, 403);
    }
    const [chat, daily, memberCount] = await Promise.all([
      resolveChat(chatID),
      getChatDailyStats(chatID, 30),
      getMemberCount(chatID),
    ]);
    if (!chat) return c.json({ error: "Chat not found" }, 404);
    await addAdmin(chatID, user.id);
    return c.json({
      chat,
      memberCount,
      daily: daily.map((d) => ({
        date: d.date,
        approved: d.approved ?? 0,
        declined: d.declined ?? 0,
      })),
    });
  });

  app.patch("/api/chats/:id", async (c) => {
    const chatID = Number(c.req.param("id"));
    if (!Number.isSafeInteger(chatID)) return c.json({ error: "Bad chat id" }, 400);
    const user = c.get("user");
    if (!(await isChatAdmin(chatID, user.id))) {
      return c.json({ error: "You are not an admin of this chat, or the bot was removed from it." }, 403);
    }
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") return c.json({ error: "Bad request" }, 400);
    const updates: string[] = [];
    if ("status" in body) {
      if (typeof body.status !== "boolean") {
        return c.json({ error: "status must be true or false" }, 400);
      }
      await setStatus(chatID, body.status);
      updates.push("status");
    }
    if ("welcome" in body) {
      if (typeof body.welcome !== "string" || body.welcome.length > 4096) {
        return c.json({ error: "welcome must be a string of at most 4096 characters" }, 400);
      }
      await setWelcome(chatID, body.welcome);
      updates.push("welcome");
    }
    if (updates.length === 0) return c.json({ error: "Nothing to update" }, 400);
    const settings = await getSettings(chatID);
    return c.json({
      updated: updates,
      settings: {
        status: settings?.status ?? true,
        welcome: settings?.welcome ?? "",
      },
    });
  });

  app.post("/api/chats/:id/sync-admins", async (c) => {
    const chatID = Number(c.req.param("id"));
    if (!Number.isSafeInteger(chatID)) return c.json({ error: "Bad chat id" }, 400);
    if (!(await isChatAdmin(chatID, c.get("user").id))) {
      return c.json({ error: "You are not an admin of this chat." }, 403);
    }
    const count = await syncAdmins(api, chatID);
    if (count === null) return c.json({ error: "Could not fetch the admin list from Telegram." }, 502);
    return c.json({ admins: count });
  });

  app.get("/api/stats", async (c) => {
    if (!helperClass.OWNERS.includes(c.get("user").id)) {
      return c.json({ error: "Stats are only available to the bot owner." }, 403);
    }
    if (statsCache && Date.now() - statsCache.at < STATS_CACHE_MS) {
      return c.json(statsCache.data as Record<string, unknown>);
    }
    const [users, chatsConfigured, chatsKnown, usersSeen, daily, top] =
      await Promise.all([
        countUsers(),
        countSettings(),
        countChats(),
        getUsersSeen(),
        getDailyStats(14),
        getTopChats(14, 6),
      ]);
    const data = {
      totals: { users, chatsConfigured, chatsKnown, usersSeen },
      daily: daily.map((d) => ({
        date: d._id,
        approved: d.approved ?? 0,
        declined: d.declined ?? 0,
      })),
      topChats: top.map((t) => ({
        chatID: t._id,
        title: t.chat?.title ?? String(t._id),
        approved: t.approved,
        declined: t.declined,
      })),
      startedAt: helperClass.START_TIME,
    };
    statsCache = { data, at: Date.now() };
    return c.json(data);
  });

  // static frontend
  app.use("/*", serveStatic({ root: "./web/app" }));
  app.get("*", serveStatic({ path: "./web/app/index.html" }));

  return app;
}
