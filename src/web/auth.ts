import config from "$env";

const enc = new TextEncoder();
const MAX_AUTH_AGE_SECONDS = 86400; // Telegram auth payloads older than a day are rejected
const SESSION_TTL_SECONDS = 7 * 86400;

export interface AuthedUser {
  id: number;
  first_name: string;
  username?: string;
  photo_url?: string;
}

async function hmacSha256(
  key: ArrayBuffer | Uint8Array,
  data: string,
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
}

function sha256(data: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", enc.encode(data));
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function freshEnough(authDate: string | null): boolean {
  const ts = Number(authDate);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  return Date.now() / 1000 - ts <= MAX_AUTH_AGE_SECONDS;
}

/**
 * Validate a Telegram Mini App initData string.
 * secret = HMAC_SHA256(key: "WebAppData", data: bot_token)
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export async function validateInitData(
  initData: string,
): Promise<AuthedUser | null> {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = await hmacSha256(enc.encode("WebAppData"), config.BOT_TOKEN);
  const expected = toHex(await hmacSha256(secret, dataCheckString));
  if (!timingSafeEqual(expected, hash.toLowerCase())) return null;
  if (!freshEnough(params.get("auth_date"))) return null;
  const userJson = params.get("user");
  if (!userJson) return null;
  try {
    const user = JSON.parse(userJson);
    if (typeof user.id !== "number") return null;
    return {
      id: user.id,
      first_name: user.first_name ?? "",
      username: user.username,
      photo_url: user.photo_url,
    };
  } catch {
    return null;
  }
}

/**
 * Validate a Telegram Login Widget payload.
 * secret = SHA256(bot_token)
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export async function validateLoginWidget(
  data: Record<string, unknown>,
): Promise<AuthedUser | null> {
  const hash = data.hash;
  if (typeof hash !== "string") return null;
  const dataCheckString = Object.keys(data)
    .filter((k) => k !== "hash" && data[k] !== undefined && data[k] !== null)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join("\n");
  const secret = await sha256(config.BOT_TOKEN);
  const expected = toHex(await hmacSha256(secret, dataCheckString));
  if (!timingSafeEqual(expected, hash.toLowerCase())) return null;
  if (!freshEnough(String(data.auth_date ?? ""))) return null;
  if (typeof data.id !== "number") return null;
  return {
    id: data.id,
    first_name: typeof data.first_name === "string" ? data.first_name : "",
    username: typeof data.username === "string" ? data.username : undefined,
    photo_url: typeof data.photo_url === "string" ? data.photo_url : undefined,
  };
}

// --- Session tokens (HMAC-signed, no extra dependency) ---------------------

const sessionKey = await hmacSha256(
  await sha256("channelactions-web-session"),
  config.BOT_TOKEN,
);

function b64urlEncode(s: string): string {
  // btoa only handles Latin1; Telegram names can contain any unicode
  const bytes = enc.encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export async function issueSessionToken(user: AuthedUser): Promise<string> {
  const payload = b64urlEncode(JSON.stringify({
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }));
  const sig = toHex(await hmacSha256(sessionKey, payload));
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  token: string,
): Promise<AuthedUser | null> {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = toHex(await hmacSha256(sessionKey, payload));
  if (!timingSafeEqual(expected, sig)) return null;
  try {
    const data = JSON.parse(b64urlDecode(payload));
    if (typeof data.id !== "number") return null;
    if (typeof data.exp !== "number" || data.exp < Date.now() / 1000) {
      return null;
    }
    return {
      id: data.id,
      first_name: data.first_name ?? "",
      username: data.username,
      photo_url: data.photo_url,
    };
  } catch {
    return null;
  }
}
