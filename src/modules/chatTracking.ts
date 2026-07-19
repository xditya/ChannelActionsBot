import { MyContext } from "../core/types.ts";
import {
  addAdmin,
  removeChat,
  syncAdmins,
  upsertChat,
} from "../database/chatsDb.ts";

import { Composer } from "grammy/mod.ts";

const composer = new Composer<MyContext>();

// Keep the CHATS registry and ADMINS mapping in sync with the bot's own
// membership. Requires "my_chat_member" in allowed_updates.
composer.on("my_chat_member", async (ctx) => {
  const upd = ctx.myChatMember;
  if (upd.chat.type == "private") return;

  const status = upd.new_chat_member.status;
  if (status == "left" || status == "kicked") {
    await removeChat(upd.chat.id);
    return;
  }

  await upsertChat({
    chatID: upd.chat.id,
    title: upd.chat.title,
    username: "username" in upd.chat ? upd.chat.username : undefined,
    type: upd.chat.type,
  });
  // whoever added or promoted the bot is an admin of the chat
  if (!upd.from.is_bot) await addAdmin(upd.chat.id, upd.from.id);
  if (status == "administrator") await syncAdmins(ctx.api, upd.chat.id);
});

export default composer;
