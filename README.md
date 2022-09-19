# ChannelActionsBot

Can be found on telegram as
[@ChannelActionsBot](https://t.me/ChannelActionsBot)!

## Features

- Auto Approve new join requests
- Auto Decline new join requets
- Custom welcome messages.

## Deploy

### Local Hosting

```
git clone https://github.com/xditya/ChannelActions -b deno
-- Make a .env file as in .env.sample ---
deno task start
```

### Deno Deploy

1. Open [deno deploy](https://dash.deno.com/), create a new project.
2. [Fork](https://github.com/xditya/ChannelActionsBot/fork) the `deno` branch of
   this repo.
3. Search for this repo on deno deploy, set branch as deno, set file as
   `serverless.ts`
4. Add your envirnoment vars and click "Link".
5. Once done, open the deployment page, copy deployment URL, set your bots
   webhook using
   `https://api.telegram.org/bot<your_bot_token_here>/setWebhook?url=<deployment_url_here>`.

## Support

- Telegram, [@BotzHubChat](https://t.me/BotzHubChat)

## Credits

- [Me](https://xditya.me) for this bot.
- [grammY](https://grammy.dev).
