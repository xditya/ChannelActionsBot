import { MyContext } from "../core/types.ts";
import { getSettings } from "../database/welcomeDb.ts";
import { recordJoinAction } from "../database/statsDb.ts";
import { hasAdmins, syncAdmins, upsertChat } from "../database/chatsDb.ts";

import { Composer, GrammyError } from "grammy/mod.ts";

const composer = new Composer<MyContext>();

// Chats that predate the dashboard have no ADMINS mapping. The first join
// request a chat sees after boot triggers a one-off admin sync, so its
// admins gain dashboard access without waiting for a my_chat_member event.
const adminSyncChecked = new Set<number>();

composer.on("chat_join_request", async (ctx) => {
  const update = ctx.update.chat_join_request;
  const settings = await getSettings(update.chat.id);
  let approve_or_not, welcome;
  const def_welcome_approve =
    "Hey {name}, your request to join {chat} has been approved!";
  const def_welcome_decline =
    "Hey {name}, your request to join {chat} has been declined!";

  if (settings == null) {
    approve_or_not = true;
    welcome = def_welcome_approve;
  } else {
    approve_or_not = settings.status;
    welcome = settings.welcome ||
      (approve_or_not ? def_welcome_approve : def_welcome_decline);
  }

  // try to approve
  try {
    if (approve_or_not) {
      await ctx.api.approveChatJoinRequest(update.chat.id, update.from.id);
    } else {
      await ctx.api.declineChatJoinRequest(update.chat.id, update.from.id);
    }
    // aggregate counters + chat title cache; failures must not break handling
    Promise.all([
      recordJoinAction(update.chat.id, approve_or_not),
      upsertChat({
        chatID: update.chat.id,
        title: update.chat.title,
        username: "username" in update.chat ? update.chat.username : undefined,
        type: update.chat.type,
      }),
    ]).catch((err) => console.warn("Stats write failed:", err.message));
    if (!adminSyncChecked.has(update.chat.id)) {
      adminSyncChecked.add(update.chat.id);
      hasAdmins(update.chat.id)
        .then((known) => known ? null : syncAdmins(ctx.api, update.chat.id))
        .catch((err) => console.warn("Admin sync failed:", err.message));
    }
  } catch (error) {
    if (
      error instanceof GrammyError &&
      (error.error_code == 400 || error.error_code == 403)
    ) {
      return;
    }
    console.log(
      "Error while approving user: ",
      error instanceof Error ? error.message : error,
    );
    return;
  }

  welcome += "\n\nSend /start to know more!";
  welcome = welcome
    .replaceAll("{name}", update.from.first_name)
    .replaceAll("{chat}", update.chat.title)
    .replaceAll("$name", update.from.first_name)
    .replaceAll("$chat", update.chat.title);

  // try to send a message
  try {
    await ctx.api.sendMessage(
      update.user_chat_id,
      welcome,
    );
  } catch (error) {
    if (error instanceof GrammyError && error.error_code == 403) return;
    console.log(
      "Error while sending a message: ",
      error instanceof Error ? error.message : error,
    );
    return;
  }
});

export default composer;
