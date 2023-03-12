# ChannelActionsBot

Can be found on telegram as
[@ChannelActionsBot](https://t.me/ChannelActionsBot)!

## Features

- Auto Approve new join requests.
- Auto Decline new join requests.
- Custom welcome messages.

## Local Hosting

[![DigitalOcean Referral Badge](https://web-platforms.sfo2.digitaloceanspaces.com/WWW/Badge%203.svg)](https://www.digitalocean.com/?refcode=7b7d6a915392&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge)

Requirements:

1. [Deno](https://deno.land/manual/getting_started/installation)
2. npm (for pm2) (skip if you plan to [use systemd](https://grammy.dev/hosting/vps.html#systemd))

### Using PM2

```
apt-get update -y && apt-get upgrade && apt install unzip npm -y && curl -fsSL https://deno.land/x/install/install.sh | sh && git clone https://github.com/xditya/ChannelActionsBot && cd ChannelActionsBot && nano .env && npm install pm2-g && pm2 start main.ts --interpreter="/root/.deno/bin/deno" --interpreter-args="run --allow-env --allow-net --allow-read --no-prompt" --name "ChannelActions" -- --polling
```

> **Warning**
> This command is only for the first run.

> **Note**
> Fill up the enviromnent vars as in [.env.sample](./.env.sample) when a nano editor is opened. Use CTRL+S and CTRL+X to save and exit, and continue installation.

> **Note**
> For viewing logs, use `pm2 logs ChannelActions`

## Deno Deploy

[![Deploy Now!](https://img.shields.io/badge/Deploy%20Now-Deno%20Deploy-blue?style=for-the-badge&logo=deno)](https://dash.deno.com/new?url=https://raw.githubusercontent.com/xditya/ChannelActionsBot/deno/main.ts&env=BOT_TOKEN,OWNERS,MONGO_URL)

> [Watch the video tutorial on deploying!](https://youtu.be/hjxfJtk5ZWs)

1. Open [deno deploy](https://dash.deno.com/), create a new project.
2. [Fork](https://github.com/xditya/ChannelActionsBot/fork) the `deno` branch of
   this repo.
3. Search for this repo on deno deploy, set branch as deno, set file as
   `main.ts`
4. Add your environment vars and click "Link".
5. Once done, open the deployment page, copy deployment URL, set your bot's
   webhook using
   `https://api.telegram.org/bot<your_bot_token_here>/setWebhook?url=<deployment_url_here>/<your_bot_token_here>`.

## Translating

> The bot now has multi-language support. You can pr your local language to this
> repo!

### How to translate?

1. Go to the [locales folder](./locales).
2. Open any file, say [en.ftl](./locales/en.ftl).
3. Copy the contents, make a new file under the locales directory, named
   `lang_code.ftl`, where `lang_code` is your language code.
4. Edit the text in the new file, save it and make a pull request to this
   repository.
5. That's it! The pr will be tested and merged.

## Support

- Telegram, [@BotzHubChat](https://t.me/BotzHubChat)

## Credits

- [Me](https://xditya.me) for this bot.
- [grammY](https://grammy.dev).
