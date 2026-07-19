/* ChannelActions dashboard — vanilla SPA, no build step */

const tg = window.Telegram?.WebApp;
const inTelegram = Boolean(tg?.initData);

const state = {
  token: localStorage.getItem("ca_token") || "",
  user: null,
  isOwner: false,
  botUsername: "",
};

const $app = document.getElementById("app");
const $toast = document.getElementById("toast");

/* ------------------------------------------------------------------ utils */

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function initials(title) {
  return esc((title || "?").trim().charAt(0).toUpperCase() || "?");
}

function avatarClass(id) {
  return `g-${Math.abs(Number(id) || 0) % 7}`;
}

function fmt(n) {
  return Number(n ?? 0).toLocaleString("en-US");
}

let toastTimer;
function toast(message, ok = true) {
  const icon = ok
    ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
    : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>';
  $toast.className = `toast show ${ok ? "ok" : "err"}`;
  $toast.innerHTML = `${icon}${esc(message)}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $toast.classList.remove("show"), 2600);
}

/* ------------------------------------------------------------------ theme */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  if (inTelegram) {
    try {
      tg.setHeaderColor(theme === "dark" ? "#17212b" : "#ffffff");
      tg.setBackgroundColor(theme === "dark" ? "#0e1621" : "#f0f5fa");
    } catch { /* older clients */ }
  }
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("ca_theme", next);
  applyTheme(next);
  render();
}

tg?.onEvent?.("themeChanged", () => {
  if (!localStorage.getItem("ca_theme")) {
    applyTheme(tg.colorScheme === "dark" ? "dark" : "light");
    render();
  }
});

/* -------------------------------------------------------------------- api */

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) {
    state.token = "";
    state.user = null;
    localStorage.removeItem("ca_token");
    throw Object.assign(new Error(body.error || "Signed out"), { status: 401 });
  }
  if (!res.ok) {
    throw Object.assign(new Error(body.error || `Request failed (${res.status})`), {
      status: res.status,
    });
  }
  return body;
}

function saveSession(token, user, isOwner) {
  state.token = token;
  state.user = user;
  state.isOwner = isOwner;
  localStorage.setItem("ca_token", token);
}

async function ensureAuth() {
  if (state.user) return true;
  if (state.token) {
    try {
      const me = await api("/api/me");
      state.user = me.user;
      state.isOwner = me.isOwner;
      return true;
    } catch { /* fall through to fresh auth */ }
  }
  if (inTelegram) {
    try {
      const res = await fetch("/api/auth/miniapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: tg.initData }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Auth failed");
      saveSession(body.token, body.user, false);
      const me = await api("/api/me");
      state.isOwner = me.isOwner;
      return true;
    } catch (err) {
      $app.innerHTML = `<p class="center-note">${esc(err.message)}</p>`;
      return false;
    }
  }
  return false;
}

/* ------------------------------------------------------------------ icons */

const planeSvg = (size) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>`;

const themeIcon = () =>
  document.documentElement.dataset.theme === "dark"
    ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M4.3 4.3l1.4 1.4M18.3 18.3l1.4 1.4M2.5 12h2M19.5 12h2M4.3 19.7l1.4-1.4M18.3 5.7l1.4-1.4"/></svg>'
    : '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';

const chevSvg =
  '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

/* ----------------------------------------------------------------- layout */

function layout(content, active) {
  const statsLink = state.isOwner
    ? `<a href="#/stats" ${active === "stats" ? 'aria-current="page"' : ""}>Stats</a>`
    : "";
  return `
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="#/channels">
        <span class="brand-mark">${planeSvg(16)}</span>
        <span class="brand-name">ChannelActions</span>
      </a>
      <nav class="nav">
        <a href="#/channels" ${active === "channels" ? 'aria-current="page"' : ""}>Channels</a>
        ${statsLink}
      </nav>
      <div class="topbar-spacer"></div>
      <button class="icon-btn" id="theme-toggle" title="Switch theme" aria-label="Switch theme">${themeIcon()}</button>
      ${
    state.user
      ? `<div class="user-chip">
        <span class="name">${esc(state.user.first_name)}</span>
        <span class="avatar ${avatarClass(state.user.id)}">${initials(state.user.first_name)}</span>
      </div>`
      : ""
  }
    </div>
  </header>
  <main class="page">${content}</main>`;
}

function mountLayoutEvents() {
  document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);
}

/* ------------------------------------------------------------ login view */

function viewLogin() {
  document.title = "Sign in — ChannelActions";
  $app.innerHTML = `
  <header class="topbar"><div class="topbar-inner">
    <span class="brand"><span class="brand-mark">${planeSvg(16)}</span><span class="brand-name">ChannelActions</span></span>
    <div class="topbar-spacer"></div>
    <button class="icon-btn" id="theme-toggle" title="Switch theme" aria-label="Switch theme">${themeIcon()}</button>
  </div></header>
  <div class="login-wrap">
    <svg class="login-plane" width="520" height="520" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
    <main class="card login-card">
      <div class="brand-mark">${planeSvg(26)}</div>
      <h1>ChannelActions</h1>
      <p class="tag">Manage join requests and welcome messages for your Telegram channels and groups.</p>
      <div class="login-widget" id="tg-widget"></div>
      <p class="login-foot">Telegram confirms it's you — no password, nothing to create. Only admins of a channel can change its settings.</p>
    </main>
  </div>`;
  mountLayoutEvents();

  window.onTelegramAuth = async (user) => {
    try {
      const res = await fetch("/api/auth/widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Login failed");
      saveSession(body.token, body.user, false);
      const me = await api("/api/me");
      state.isOwner = me.isOwner;
      location.hash = "#/channels";
    } catch (err) {
      toast(err.message, false);
    }
  };

  if (state.botUsername) {
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.setAttribute("data-telegram-login", state.botUsername);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "22");
    s.setAttribute("data-onauth", "onTelegramAuth(user)");
    document.getElementById("tg-widget").appendChild(s);
  }
}

/* -------------------------------------------------------- channels view */

async function viewChannels() {
  document.title = "Your channels — ChannelActions";
  $app.innerHTML = layout(`<p class="center-note">Loading your channels…</p>`, "channels");
  mountLayoutEvents();
  tg?.BackButton?.hide();

  let chats;
  try {
    ({ chats } = await api("/api/chats"));
  } catch (err) {
    if (err.status === 401) return route();
    $app.innerHTML = layout(`<p class="center-note">${esc(err.message)}</p>`, "channels");
    mountLayoutEvents();
    return;
  }

  const addUrl = `https://t.me/${state.botUsername}?startchannel&admin=invite_users+manage_chat`;

  const cards = chats.map((chat) => `
    <a class="card channel-card" href="#/chat/${chat.chatID}">
      <span class="avatar ${avatarClass(chat.chatID)}">${initials(chat.title)}</span>
      <span class="info">
        <span class="title">${esc(chat.title)}</span>
        <span class="meta">${
    chat.username ? `@${esc(chat.username)}` : `<span class="mono">${chat.chatID}</span>`
  } &middot; ${chat.type === "channel" ? "Channel" : "Group"}</span>
        <span class="pills">
          ${
    chat.status
      ? '<span class="pill pill-approve"><span class="dot"></span>Auto-approve on</span>'
      : '<span class="pill pill-decline"><span class="dot"></span>Declining requests</span>'
  }
          ${chat.welcomeSet ? '<span class="pill pill-neutral">Custom welcome</span>' : ""}
        </span>
      </span>
      ${chevSvg}
    </a>`).join("");

  const addCard = `
    <a class="card channel-card channel-card-add" href="${addUrl}" target="_blank" rel="noopener">
      <span class="plus"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>
      <span style="font-weight:600;">Add to a channel or group</span>
      <span style="font-size:12.5px;">Make the bot admin with &ldquo;Add members&rdquo; permission</span>
    </a>`;

  const empty = `
    <div class="card empty">
      <div class="art">${planeSvg(34)}</div>
      <h2>No channels yet</h2>
      <p>Add <strong>@${esc(state.botUsername)}</strong> to a channel or group as an admin with the &ldquo;Add members&rdquo; permission. It shows up here right after — or forward any message from the channel to the bot.</p>
      <div class="actions">
        <a class="btn btn-primary" href="${addUrl}" target="_blank" rel="noopener">Add to a channel</a>
        <button class="btn btn-ghost" id="refresh-btn">I already added it — refresh</button>
      </div>
    </div>`;

  const body = `
    <div class="page-head">
      <div>
        <h1>Your channels</h1>
        <p class="sub">${chats.length ? `${chats.length} chat${chats.length === 1 ? "" : "s"} &middot; changes apply instantly` : "Channels and groups where you and the bot are admins"}</p>
      </div>
      ${
    chats.length
      ? `<div class="tools"><label class="search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input type="search" id="chat-search" placeholder="Search channels">
        </label></div>`
      : ""
  }
    </div>
    ${chats.length ? `<div class="channel-grid" id="chat-grid">${cards}${addCard}</div>` : empty}`;

  $app.innerHTML = layout(body, "channels");
  mountLayoutEvents();

  document.getElementById("refresh-btn")?.addEventListener("click", () => viewChannels());
  document.getElementById("chat-search")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll("#chat-grid .channel-card:not(.channel-card-add)").forEach((el) => {
      el.style.display = el.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });
}

/* ------------------------------------------------------------ chat view */

function renderPreviewText(welcome, status, chatTitle) {
  const def = status
    ? "Hey {name}, your request to join {chat} has been approved!"
    : "Hey {name}, your request to join {chat} has been declined!";
  let text = (welcome.trim() || def) + "\n\nSend /start to know more!";
  const name = state.user?.first_name || "there";
  return text
    .replaceAll("{name}", name).replaceAll("{chat}", chatTitle)
    .replaceAll("$name", name).replaceAll("$chat", chatTitle);
}

async function viewChat(chatID) {
  $app.innerHTML = layout(`<p class="center-note">Loading settings…</p>`, "channels");
  mountLayoutEvents();
  if (inTelegram && tg.BackButton) {
    tg.BackButton.show();
    tg.BackButton.onClick(() => (location.hash = "#/channels"));
  }

  let data;
  try {
    data = await api(`/api/chats/${chatID}`);
  } catch (err) {
    if (err.status === 401) return route();
    $app.innerHTML = layout(
      `<a class="back-link" href="#/channels">&larr; Channels</a>
       <p class="center-note">${esc(err.message)}</p>`,
      "channels",
    );
    mountLayoutEvents();
    return;
  }

  const { chat, settings } = data;
  document.title = `${chat.title} — ChannelActions`;
  const saved = { status: settings.status, welcome: settings.welcome };
  const draft = { ...saved };
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  const body = `
    <a class="back-link" href="#/channels">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
      Channels
    </a>
    <div class="channel-head">
      <span class="avatar ${avatarClass(chat.chatID)}">${initials(chat.title)}</span>
      <div>
        <h1>${esc(chat.title)}</h1>
        <p class="meta">${chat.username ? `@${esc(chat.username)} &middot; ` : ""}${chat.type === "channel" ? "Channel" : "Group"} &middot; <span class="mono">${chat.chatID}</span></p>
      </div>
      ${
    chat.username
      ? `<div class="tools"><a class="btn btn-ghost" href="https://t.me/${esc(chat.username)}" target="_blank" rel="noopener">${planeSvg(15)} Open in Telegram</a></div>`
      : ""
  }
    </div>
    <div class="settings-layout">
      <div class="settings-col">
        <section class="card setting-card">
          <h2>Join requests</h2>
          <p class="desc">What happens when someone asks to join ${esc(chat.title)}.</p>
          <div class="segmented">
            <button class="segment segment-approve" id="seg-approve">
              <span class="icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>
              <span><span class="label">Approve automatically</span><span class="hint">Everyone gets in</span></span>
            </button>
            <button class="segment segment-decline" id="seg-decline">
              <span class="icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></span>
              <span><span class="label">Decline automatically</span><span class="hint">No one gets in</span></span>
            </button>
          </div>
          <p class="mode-note" id="mode-note"></p>
        </section>
        <section class="card setting-card editor">
          <h2>Welcome message</h2>
          <p class="desc">Sent to the member in a private chat after their request is handled. Leave empty to use the default.</p>
          <textarea id="welcome-input" spellcheck="false" maxlength="4096" placeholder="Hey {name}! Welcome to {chat}…"></textarea>
          <div class="editor-foot">
            <button class="token-chip" data-token="{name}">{name}</button>
            <button class="token-chip" data-token="{chat}">{chat}</button>
            <span class="token-hint">Click to insert &middot; the member&rsquo;s name and the chat title</span>
            <span class="char-count" id="char-count"></span>
          </div>
        </section>
      </div>
      <aside class="card preview-card">
        <h2>Preview</h2>
        <p class="desc" id="preview-desc"></p>
        <div class="phone">
          <div class="phone-status"><span>${time}</span><span>&#9679;&#9679;&#9679;&#9679; &#128246;</span></div>
          <div class="phone-chat-head">
            <span class="avatar g-5">${planeSvg(14)}</span>
            <div class="who"><div class="n">Channel Actions</div><div class="s">bot</div></div>
          </div>
          <div class="phone-wall">
            <span class="day-chip">Today</span>
            <div class="bubble"><span id="preview-text"></span><span class="time">${time}</span></div>
          </div>
        </div>
      </aside>
    </div>
    <div class="save-bar" id="save-bar">
      <span class="msg"><span class="dot"></span>Unsaved changes</span>
      <span class="actions">
        <button class="btn btn-ghost" id="discard-btn">Discard</button>
        <button class="btn btn-primary" id="save-btn">Save changes</button>
      </span>
    </div>`;

  $app.innerHTML = layout(body, "channels");
  mountLayoutEvents();

  const $welcome = document.getElementById("welcome-input");
  const $charCount = document.getElementById("char-count");
  const $saveBar = document.getElementById("save-bar");
  const $segApprove = document.getElementById("seg-approve");
  const $segDecline = document.getElementById("seg-decline");
  $welcome.value = draft.welcome;

  function refresh() {
    $segApprove.setAttribute("aria-pressed", String(draft.status));
    $segDecline.setAttribute("aria-pressed", String(!draft.status));
    document.getElementById("mode-note").textContent = draft.status
      ? "New requests are approved the moment they arrive. The member then receives your welcome message in a private chat."
      : "New requests are declined the moment they arrive. The member is told in a private chat.";
    document.getElementById("preview-desc").textContent =
      `What ${state.user?.first_name || "a member"} sees after being ${draft.status ? "approved" : "declined"}.`;
    document.getElementById("preview-text").textContent =
      renderPreviewText(draft.welcome, draft.status, chat.title);
    $charCount.textContent = `${draft.welcome.length} / 4096`;
    const dirty = draft.status !== saved.status || draft.welcome !== saved.welcome;
    $saveBar.classList.toggle("show", dirty);
  }

  $segApprove.addEventListener("click", () => { draft.status = true; refresh(); });
  $segDecline.addEventListener("click", () => { draft.status = false; refresh(); });
  $welcome.addEventListener("input", () => { draft.welcome = $welcome.value; refresh(); });

  document.querySelectorAll(".token-chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      $welcome.setRangeText(chip.dataset.token, $welcome.selectionStart, $welcome.selectionEnd, "end");
      $welcome.focus();
      draft.welcome = $welcome.value;
      refresh();
    })
  );

  document.getElementById("discard-btn").addEventListener("click", () => {
    draft.status = saved.status;
    draft.welcome = saved.welcome;
    $welcome.value = saved.welcome;
    refresh();
  });

  document.getElementById("save-btn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      const res = await api(`/api/chats/${chatID}`, {
        method: "PATCH",
        body: JSON.stringify({ status: draft.status, welcome: draft.welcome }),
      });
      saved.status = res.settings.status;
      saved.welcome = res.settings.welcome;
      refresh();
      toast("Saved");
      tg?.HapticFeedback?.notificationOccurred?.("success");
    } catch (err) {
      toast(err.message, false);
    } finally {
      btn.disabled = false;
      btn.textContent = "Save changes";
    }
  });

  refresh();
}

/* ----------------------------------------------------------- stats view */

function niceCeil(n) {
  if (n <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 2, 5, 10]) if (m * pow >= n) return m * pow;
  return 10 * pow;
}

function renderChart(daily) {
  const wrap = document.getElementById("chart-wrap");
  if (!wrap) return;
  const total = daily.reduce((sum, d) => sum + d.approved + d.declined, 0);
  if (total === 0) {
    wrap.innerHTML =
      '<div class="chart-empty">No join requests recorded yet. Stats start counting from the first request after this update — check back tomorrow.</div>';
    return;
  }
  wrap.innerHTML = `<svg id="chart" viewBox="0 0 760 232" width="100%" role="img" aria-label="Join requests per day"></svg>
    <div class="chart-tooltip" id="tooltip" style="display:none;">
      <div class="t-date"></div>
      <div class="t-row"><span class="swatch" style="background:var(--chart-1)"></span>Approved<span class="v v-a"></span></div>
      <div class="t-row"><span class="swatch" style="background:var(--chart-2)"></span>Declined<span class="v v-d"></span></div>
    </div>`;

  const svg = document.getElementById("chart");
  const NS = "http://www.w3.org/2000/svg";
  const PLOT = { left: 46, right: 752, top: 12, base: 196 };
  const MAX = niceCeil(Math.max(...daily.map((d) => d.approved + d.declined)));
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const el = (name, attrs) => {
    const node = document.createElementNS(NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    svg.appendChild(node);
    return node;
  };

  for (let i = 0; i <= 4; i++) {
    const v = (MAX / 4) * i;
    const y = PLOT.base - (v / MAX) * (PLOT.base - PLOT.top);
    el("line", {
      x1: PLOT.left, x2: PLOT.right, y1: y, y2: y,
      stroke: i === 0 ? css("--baseline") : css("--grid"), "stroke-width": 1,
    });
    el("text", {
      x: PLOT.left - 8, y: y + 3.5, "text-anchor": "end",
      "font-size": 10.5, fill: css("--ink-3"), "font-family": "Inter, sans-serif",
    }).textContent = v >= 1000 ? `${v / 1000}k` : String(Math.round(v));
  }

  const slot = (PLOT.right - PLOT.left) / daily.length;
  const barW = Math.min(26, slot * 0.6);
  const scale = (v) => (v / MAX) * (PLOT.base - PLOT.top);
  const labelEvery = Math.ceil(daily.length / 7);

  daily.forEach((day, i) => {
    const x = PLOT.left + i * slot + (slot - barW) / 2;
    const hA = scale(day.approved);
    const hX = day.declined > 0 ? Math.max(scale(day.declined), 3) : 0;
    if (hA > 0) el("rect", { x, y: PLOT.base - hA, width: barW, height: hA, fill: css("--chart-1") });
    if (hX > 0) {
      el("rect", {
        x, y: PLOT.base - hA - (hA > 0 ? 2 : 0) - hX, width: barW, height: hX,
        rx: 3, fill: css("--chart-2"),
      });
    }
    if (i % labelEvery === 0) {
      el("text", {
        x: x + barW / 2, y: PLOT.base + 18, "text-anchor": "middle",
        "font-size": 10.5, fill: css("--ink-3"), "font-family": "Inter, sans-serif",
      }).textContent = day.label;
    }
    const hit = el("rect", {
      x: PLOT.left + i * slot, y: PLOT.top, width: slot,
      height: PLOT.base - PLOT.top, fill: "transparent",
    });
    hit.addEventListener("mouseenter", () => {
      const tip = document.getElementById("tooltip");
      tip.querySelector(".t-date").textContent = day.label;
      tip.querySelector(".v-a").textContent = fmt(day.approved);
      tip.querySelector(".v-d").textContent = fmt(day.declined);
      tip.style.display = "block";
      const rect = svg.getBoundingClientRect();
      const cx = ((PLOT.left + i * slot + slot / 2) / 760) * rect.width;
      tip.style.left = Math.min(cx + 14, rect.width - 170) + "px";
      tip.style.top = "26px";
    });
    hit.addEventListener("mouseleave", () => {
      document.getElementById("tooltip").style.display = "none";
    });
  });
}

async function viewStats() {
  document.title = "Stats — ChannelActions";
  $app.innerHTML = layout(`<p class="center-note">Loading stats…</p>`, "stats");
  mountLayoutEvents();
  tg?.BackButton?.hide();

  let data;
  try {
    data = await api("/api/stats");
  } catch (err) {
    if (err.status === 401) return route();
    $app.innerHTML = layout(`<p class="center-note">${esc(err.message)}</p>`, "stats");
    mountLayoutEvents();
    return;
  }

  // fill a continuous 14-day series
  const byDate = new Map(data.daily.map((d) => [d.date, d]));
  const daily = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    const key = date.toISOString().slice(0, 10);
    const hit = byDate.get(key);
    daily.push({
      label: date.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      approved: hit?.approved ?? 0,
      declined: hit?.declined ?? 0,
    });
  }
  const approved14 = daily.reduce((sum, d) => sum + d.approved, 0);
  const total14 = daily.reduce((sum, d) => sum + d.approved + d.declined, 0);
  const rate = total14 ? ((approved14 / total14) * 100).toFixed(1) + "%" : "—";

  const maxTop = Math.max(1, ...data.topChats.map((t) => t.approved + t.declined));
  const rows = data.topChats.map((t) => {
    const total = t.approved + t.declined;
    return `<tr>
      <td><span class="chan"><span class="avatar ${avatarClass(t.chatID)}">${initials(t.title)}</span>${esc(t.title)}</span></td>
      <td class="num">${fmt(total)}</td>
      <td><span class="share-bar"><i style="width:${Math.round((total / maxTop) * 100)}%"></i></span></td>
      <td class="num">${total ? ((t.approved / total) * 100).toFixed(1) + "%" : "—"}</td>
    </tr>`;
  }).join("");

  const body = `
    <div class="page-head">
      <div>
        <h1>Bot statistics</h1>
        <p class="sub">Everything the bot has handled, across all chats</p>
      </div>
      <div class="tools"><span class="owner-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.5 6.8L12 16.8 5.9 20.3l1.5-6.8L2.2 8.9l6.9-.6L12 2z"/></svg>
        Owner only
      </span></div>
    </div>
    <div class="kpi-row">
      <div class="card stat-tile"><div class="label">Total users</div><div class="value">${fmt(data.totals.users)}</div><div class="delta">started the bot</div></div>
      <div class="card stat-tile"><div class="label">Chats configured</div><div class="value">${fmt(data.totals.chatsConfigured)}</div><div class="delta">${fmt(data.totals.chatsKnown)} known to the dashboard</div></div>
      <div class="card stat-tile"><div class="label">Requests &middot; 14 days</div><div class="value">${fmt(total14)}</div><div class="delta">joins processed</div></div>
      <div class="card stat-tile"><div class="label">Approval rate</div><div class="value">${rate}</div><div class="delta">of requests approved</div></div>
    </div>
    <section class="card chart-card">
      <div class="chart-head">
        <h2>Join requests</h2>
        <span class="sub">Last 14 days</span>
        <div class="legend">
          <span class="key"><span class="swatch" style="background:var(--chart-1)"></span>Approved</span>
          <span class="key"><span class="swatch" style="background:var(--chart-2)"></span>Declined</span>
        </div>
      </div>
      <div class="chart-wrap" id="chart-wrap"></div>
    </section>
    ${
    data.topChats.length
      ? `<section class="card table-card">
        <h2>Most active chats &middot; 14 days</h2>
        <div class="table-scroll"><table>
          <thead><tr><th>Chat</th><th class="num">Requests</th><th>Share</th><th class="num">Approved</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </section>`
      : ""
  }
    <p class="sub" style="color:var(--ink-3);font-size:12.5px;">Lifetime users seen (approved or declined): ${fmt(data.totals.usersSeen)}</p>`;

  $app.innerHTML = layout(body, "stats");
  mountLayoutEvents();
  renderChart(daily);
}

/* ----------------------------------------------------------------- router */

async function route() {
  const hash = location.hash || "#/channels";
  const authed = await ensureAuth();
  if (!authed) {
    if (inTelegram) return; // error already shown
    return viewLogin();
  }
  if (hash.startsWith("#/chat/")) {
    const id = Number(hash.slice(7));
    if (Number.isSafeInteger(id)) return viewChat(id);
  }
  if (hash === "#/stats") return viewStats();
  return viewChannels();
}

function render() {
  route();
}

window.addEventListener("hashchange", route);

/* ------------------------------------------------------------------- boot */

(async function boot() {
  if (inTelegram) {
    tg.ready();
    tg.expand();
  }
  applyTheme(document.documentElement.dataset.theme);
  try {
    const cfg = await fetch("/api/config").then((r) => r.json());
    state.botUsername = cfg.botUsername;
  } catch { /* config is only needed for links and the login widget */ }
  await route();
})();
