import { MyContext } from "../core/types.ts";

import { Composer, InlineKeyboard, Keyboard } from "grammy/mod.ts";

const composer = new Composer<MyContext>();

composer.callbackQuery("helper", async (ctx) => {
  try {
    await ctx.editMessageText(
      ctx.t("help") +
        "\n\nTo approve members who are already in waiting list, upgrade to premium! Contact @xditya_bot for information on pricing.",
      {
        reply_markup: new InlineKeyboard()
          .text("Add me to your channel", "add_to_channel")
          .text("Add me to your group", "add_to_group")
          .row()
          .text(
            "Main Menu 📭",
            "mainMenu",
          ),
        parse_mode: "HTML",
      },
    );
  } catch (err) {
    console.log(err);
  }
});

composer.callbackQuery(/add_to_(.*)/, async (ctx) => {
  const channelOrGroup = ctx.match?.[1];
  await ctx.editMessageText(
    "You can add me to channels as well as groups. Use the buttons below!",
    {
      reply_markup: new InlineKeyboard()
        .url(
          `Add to ${channelOrGroup}`,
          `https://t.me/${ctx.me.username}?start${channelOrGroup}=by_BotzHub&admin=invite_users+manage_chat`,
        )
        .text("✅ Done", `select_${channelOrGroup}`).row()
        .text("« Back", "mainMenu"),
    },
  );
});

composer.callbackQuery(/select_(.*)/, async (ctx) => {
  const channelOrGroup = ctx.match?.[1];
  await ctx.reply(
    `Select the ${channelOrGroup} you just added the bot to, so as to configure settings of the ${channelOrGroup}.\n\nSettings include:\n- Custom Welcome\n- Auto Approve\n- Auto Disapprove`,
    {
      reply_markup: new Keyboard().requestChat(
        `Select the ${channelOrGroup}`,
        1,
        {
          chat_is_channel: channelOrGroup == "channel",
          bot_is_member: true,
          bot_administrator_rights: {
            can_invite_users: true,
            can_manage_chat: true,
            is_anonymous: false,
            can_delete_messages: false,
            can_restrict_members: false,
            can_manage_video_chats: false,
            can_promote_members: false,
            can_change_info: false,
          },
          user_administrator_rights: {
            can_invite_users: true,
            can_manage_chat: true,
            is_anonymous: false,
            can_delete_messages: false,
            can_restrict_members: false,
            can_manage_video_chats: false,
            can_promote_members: false,
            can_change_info: false,
          },
        },
      )
        .row()
        .resized()
        .oneTime()
        .placeholder(
          "Choose a chat from the buttons below",
        ),
    },
  );
  await ctx.deleteMessage();
});

export default composer;
