# ChannelActionsBot

Can be found on telegram as
[@ChannelActionsBot](https://t.me/ChannelActionsBot)!

## Features

- Auto Approve new join requests.
- Auto Decline new join requests.
- Custom welcome messages.

## Deploy

### Local Hosting

```
git clone https://github.com/xditya/ChannelActions -b deno
-- Make a .env file as in .env.sample ---
deno task start
```

### Deno Deploy

> [Watch the video tutorial on deploying!](https://youtu.be/hjxfJtk5ZWs)
1. Open [deno deploy](https://dash.deno.com/), create a new project.
2. [Fork](https://github.com/xditya/ChannelActionsBot/fork) the `deno` branch of
   this repo.
3. Search for this repo on deno deploy, set branch as deno, set file as
   `serverless.ts`
4. Add your environment vars and click "Link".
5. Once done, open the deployment page, copy deployment URL, set your bot's
   webhook using
   `https://api.telegram.org/bot<your_bot_token_here>/setWebhook?url=<deployment_url_here>/<your_bot_token_here>`.


## Translating
> The bot now has multi-language support. You can pr your local language to this repo!

### How to translate?
1. Go to the [locales folder](./locales).
2. Open any file, say [en.ftl](./locales/en.ftl).
3. Copy the contents, make a new file under the locales directory, named `lang_code.ftl`, where `lang_code` is your language code. 
4. Edit the text in the new file, save it and make a pull request to this repository. 
5. That's it! The pr will be tested and merged.
   
## Support

- Telegram, [@BotzHubChat](https://t.me/BotzHubChat)

## Credits

- [Me](https://xditya.me) for this bot.
- [grammY](https://grammy.dev).
