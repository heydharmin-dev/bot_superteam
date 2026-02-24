# Superteam Onboarding Bot — Design Document

**Date:** 2026-02-24
**Status:** Approved

## Overview

Telegram bot for Superteam MY that onboards new members by requiring them to introduce themselves in an intro channel before participating in the main group. Includes a React admin dashboard.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | Node.js (Telegraf) | User preference, async-first, good ecosystem |
| Database | Supabase (PostgreSQL) | Hosted, free tier, JS client, auth built-in |
| Architecture | Event-driven middleware | Clean separation, testable, extensible |
| Enforcement | Configurable (mute or auto-delete) | Flexibility for admins |
| Admin UI | React + shadcn/ui + Tailwind | Modern, polished, component library |
| Deployment | Docker + cloud platform docs | Maximum flexibility |

## Architecture

```
┌─────────────────────────────────────────────┐
│                 Telegraf Bot                  │
├──────────┬──────────┬───────────┬───────────┤
│ joinHan- │ introMon │ enforce-  │ admin     │
│ dler     │ itor     │ ment MW   │ Commands  │
├──────────┴──────────┴───────────┴───────────┤
│              Supabase Client                 │
├─────────────────────────────────────────────┤
│            Supabase (PostgreSQL)             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│          Admin Dashboard (React)             │
├──────────┬──────────┬───────────┬───────────┤
│ Dashboard│ Members  │ Settings  │ Activity  │
├──────────┴──────────┴───────────┴───────────┤
│         Supabase Client (direct)             │
└─────────────────────────────────────────────┘
```

## Bot Modules

### 1. joinHandler
- Detects `new_chat_members` events
- Restricts user in main group (mute)
- Sends welcome DM with intro format and link to intro channel
- Falls back to in-group tagged message if DM is blocked (auto-deletes after 60s)

### 2. introMonitor
- Watches intro channel for new messages
- Runs heuristic validation:
  - Length > 50 characters
  - Contains at least 2 format markers ("based in", "fun fact", "contribute", "looking to", "who am I")
- On pass: marks user `completed`, unrestricts in main group, sends congrats
- On fail: gently asks user to expand their intro

### 3. enforcementMiddleware
- Intercepts all messages in main group
- Checks user's intro status in Supabase
- **Mute mode:** User is already muted via Telegram permissions (no action needed)
- **Auto-delete mode:** Deletes message, sends reminder, reminder auto-deletes after 30s

### 4. adminCommands
- `/reset_intro @username` — Reset user's intro status to pending
- `/approve_user @username` — Manually mark user as approved (bypasses intro)
- `/bot_status` — Show bot stats (total members, pending, completed)
- `/set_enforcement <mute|auto_delete>` — Change enforcement mode

## Data Model

### `members` table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| telegram_id | bigint (unique) | Telegram user ID |
| username | text | Telegram username |
| first_name | text | Display name |
| intro_status | text | `pending` / `completed` / `approved` |
| intro_message_id | bigint | Message ID of their intro |
| joined_at | timestamptz | When they joined |
| intro_completed_at | timestamptz | When intro was completed |

### `activity_log` table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| action | text | `join`, `intro_completed`, `message_deleted`, `admin_approve`, `admin_reset` |
| telegram_id | bigint | User involved |
| details | jsonb | Additional context |
| created_at | timestamptz | Timestamp |

### `settings` table
| Column | Type | Description |
|--------|------|-------------|
| key | text (PK) | Setting name |
| value | jsonb | Setting value |

## Admin Dashboard

### Stack
- React (Vite) + TypeScript
- shadcn/ui components
- Tailwind CSS
- Supabase JS client

### Pages
1. **Dashboard** — Stats cards (total members, pending, completed, recent joins), recent activity feed
2. **Members** — Searchable/filterable DataTable, row actions (approve, reset, view intro)
3. **Settings** — Enforcement mode toggle, editable welcome message, editable intro example, channel IDs
4. **Activity Log** — Filterable table of all bot actions

### Auth
- Supabase Auth (email/password)
- Only pre-configured admin emails can access

## Configuration

### Environment Variables
```
BOT_TOKEN=              # Telegram bot token from @BotFather
SUPABASE_URL=           # Supabase project URL
SUPABASE_ANON_KEY=      # Supabase anon/public key
SUPABASE_SERVICE_KEY=   # Supabase service role key (bot only)
MAIN_GROUP_ID=          # Telegram main group chat ID
INTRO_CHANNEL_ID=       # Telegram intro channel chat ID
ENFORCEMENT_MODE=mute   # mute or auto_delete
```

## Edge Cases

- **DM blocked:** Post welcome in-group (tagged), auto-delete after 60s
- **Rejoin:** Check existing status — if `completed`/`approved`, unrestrict immediately
- **Deleted intro:** Status remains `completed` (one-time gate)
- **Admin override:** `/approve_user` bypasses intro requirement
- **Bot restart:** All state in Supabase, no in-memory state lost

## File Structure

```
bot_superteam/
├── bot/
│   ├── src/
│   │   ├── bot.js
│   │   ├── config.js
│   │   ├── db/
│   │   │   ├── supabase.js
│   │   │   └── members.js
│   │   ├── handlers/
│   │   │   ├── join.js
│   │   │   ├── intro.js
│   │   │   └── admin.js
│   │   ├── middleware/
│   │   │   └── enforcement.js
│   │   └── utils/
│   │       ├── messages.js
│   │       └── validation.js
│   ├── .env.example
│   ├── package.json
│   └── Dockerfile
├── dashboard/
│   ├── src/
│   │   ├── components/ui/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Members.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── ActivityLog.tsx
│   │   ├── lib/supabase.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Message Templates

### Welcome Message
```
Welcome to Superteam MY!

To get started, please introduce yourself in the Intro Channel using this format:

- Who are you & what do you do?
- Where are you based?
- One fun fact about you
- How are you looking to contribute to Superteam MY?

No pressure to be perfect — just be you!
```

### Reminder (when user tries to post without intro)
```
Hey! You haven't introduced yourself yet.
Please post your intro in the Intro Channel first, then you'll be able to chat here.
```

### Congrats (after intro completed)
```
Thanks for introducing yourself! You now have full access to the group. Welcome aboard!
```
