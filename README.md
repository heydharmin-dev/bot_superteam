# Superteam Onboarding Bot

A Telegram bot that onboards new members to Superteam MY by requiring them to introduce themselves before participating in the main group. Includes an admin dashboard for managing members and settings.

## Features

### Bot
- **New Member Detection** — Automatically detects when users join the main group
- **Welcome Message** — Sends a DM with intro format guide (falls back to in-group message if DMs are blocked)
- **Intro Validation** — Monitors the intro channel and validates messages against the expected format
- **Access Control** — Two configurable modes:
  - **Mute mode** — Restricts user permissions until intro is completed
  - **Auto-delete mode** — Deletes messages from users who haven't introduced themselves
- **Admin Commands** — `/approve_user`, `/reset_intro`, `/bot_status`, `/set_enforcement`
- **Edge Cases** — Handles rejoins, blocked DMs, deleted intros gracefully

### Admin Dashboard
- **Overview** — Stats cards showing member counts and recent activity
- **Members** — Searchable table with approve/reset actions
- **Settings** — Configure enforcement mode, welcome message, intro example
- **Activity Log** — Filterable log of all bot actions
- **Auth** — Supabase-based admin authentication

## Tech Stack

- **Bot:** Node.js, Telegraf, Supabase
- **Dashboard:** React, Vite, TypeScript, shadcn/ui, Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Deployment:** Docker, Docker Compose

## Prerequisites

- Node.js 20+
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))
- A Supabase project (free tier works)
- Docker (optional, for containerized deployment)

## Setup

### 1. Create a Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Save the bot token

### 2. Set Up Telegram Groups

1. Create a **main group** for your community
2. Create a separate **intro channel** (can be a group or channel where members can post)
3. Add your bot to both groups and make it an **admin** with permissions to:
   - Delete messages
   - Restrict members
   - Send messages

### 3. Get Group/Channel IDs

The easiest way to get chat IDs:
1. Add the bot to the group
2. Send a message in the group
3. Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find the `chat.id` field for each group

Note: Group IDs are typically negative numbers (e.g., `-1001234567890`).

### 4. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the schema in `bot/supabase-schema.sql`
3. Get your project URL and API keys from Settings > API
4. (For dashboard auth) Create an admin user in Authentication > Users

### 5. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

For the dashboard, also copy:
```bash
cp dashboard/.env.example dashboard/.env
```

## Running Locally

### Bot

```bash
cd bot
npm install
npm run dev
```

### Dashboard

```bash
cd dashboard
npm install
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

## Docker Deployment

### Build and run both services:

```bash
docker compose up -d --build
```

The bot will run in the background and the dashboard will be available at `http://localhost:3000`.

### Individual services:

```bash
# Bot only
docker compose up -d bot

# Dashboard only
docker compose up -d dashboard
```

## Cloud Deployment

### Railway

1. Fork this repo
2. Create a new project on [Railway](https://railway.app)
3. Add a new service from your GitHub repo
4. Set the root directory to `bot/`
5. Add environment variables from `.env.example`
6. Repeat for the dashboard with root directory `dashboard/`

### Render

1. Fork this repo
2. Create a new Web Service on [Render](https://render.com)
3. Connect your GitHub repo
4. For the bot: set build command to `cd bot && npm install` and start command to `cd bot && npm start`
5. For the dashboard: set build command to `cd dashboard && npm install && npm run build` and publish directory to `dashboard/dist`
6. Add environment variables

## Admin Commands

| Command | Description |
|---------|-------------|
| `/approve_user <id>` | Manually approve a user (bypass intro requirement) |
| `/reset_intro <id>` | Reset a user's intro status to pending |
| `/bot_status` | Show member statistics |
| `/set_enforcement <mute\|auto_delete>` | Change enforcement mode |

You can also reply to a user's message instead of specifying their ID.

## Architecture

```
bot_superteam/
├── bot/                    # Telegram bot
│   ├── src/
│   │   ├── bot.js          # Entry point
│   │   ├── config.js       # Environment config
│   │   ├── db/             # Supabase client & queries
│   │   ├── handlers/       # Join, intro, admin handlers
│   │   ├── middleware/      # Enforcement middleware
│   │   └── utils/          # Messages & validation
│   └── Dockerfile
├── dashboard/              # Admin panel
│   ├── src/
│   │   ├── components/     # Layout & shadcn UI
│   │   ├── pages/          # Dashboard, Members, Settings, Activity
│   │   └── lib/            # Supabase client & auth
│   └── Dockerfile
└── docker-compose.yml
```

## License

MIT
