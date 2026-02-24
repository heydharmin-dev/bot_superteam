# Superteam Onboarding Bot — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Telegram onboarding bot + React admin dashboard that enforces member introductions before allowing participation in the main group.

**Architecture:** Event-driven Telegraf middleware pipeline backed by Supabase. Four modules (joinHandler, introMonitor, enforcementMiddleware, adminCommands) plus a React+shadcn admin dashboard connecting directly to the same Supabase instance.

**Tech Stack:** Node.js, Telegraf, Supabase (PostgreSQL + Auth), React, Vite, TypeScript, shadcn/ui, Tailwind CSS, Docker

**Design doc:** `docs/plans/2026-02-24-superteam-onboarding-bot-design.md`

---

## Task 1: Project Scaffolding — Bot

**Files:**
- Create: `bot/package.json`
- Create: `bot/.env.example`
- Create: `bot/src/config.js`

**Step 1: Initialize bot package**

```bash
cd bot
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install telegraf @supabase/supabase-js dotenv
npm install --save-dev nodemon
```

**Step 3: Create `.env.example`**

```env
BOT_TOKEN=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
MAIN_GROUP_ID=
INTRO_CHANNEL_ID=
ENFORCEMENT_MODE=mute
```

**Step 4: Create `bot/src/config.js`**

```js
require('dotenv').config();

const config = {
  botToken: process.env.BOT_TOKEN,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
  mainGroupId: Number(process.env.MAIN_GROUP_ID),
  introChannelId: Number(process.env.INTRO_CHANNEL_ID),
  enforcementMode: process.env.ENFORCEMENT_MODE || 'mute',
};

// Validate required config
const required = ['botToken', 'supabaseUrl', 'supabaseServiceKey', 'mainGroupId', 'introChannelId'];
for (const key of required) {
  if (!config[key]) {
    throw new Error(`Missing required environment variable for: ${key}`);
  }
}

module.exports = config;
```

**Step 5: Add scripts to `package.json`**

Add to scripts:
```json
{
  "start": "node src/bot.js",
  "dev": "nodemon src/bot.js"
}
```

**Step 6: Commit**

```bash
git add bot/
git commit -m "feat: scaffold bot project with config and dependencies"
```

---

## Task 2: Supabase Database Layer

**Files:**
- Create: `bot/src/db/supabase.js`
- Create: `bot/src/db/members.js`
- Create: `bot/supabase-schema.sql`

**Step 1: Create Supabase schema SQL**

Create `bot/supabase-schema.sql` — this is run manually in the Supabase SQL editor:

```sql
-- Members table
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  intro_status TEXT NOT NULL DEFAULT 'pending' CHECK (intro_status IN ('pending', 'completed', 'approved')),
  intro_message_id BIGINT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  intro_completed_at TIMESTAMPTZ
);

CREATE INDEX idx_members_telegram_id ON members (telegram_id);
CREATE INDEX idx_members_intro_status ON members (intro_status);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  telegram_id BIGINT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_created_at ON activity_log (created_at DESC);
CREATE INDEX idx_activity_log_telegram_id ON activity_log (telegram_id);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Seed default settings
INSERT INTO settings (key, value) VALUES
  ('enforcement_mode', '"mute"'),
  ('welcome_message', '"👋 Welcome to Superteam MY!\n\nTo get started, please introduce yourself in the Intro Channel using this format 👇\n\nThis helps everyone get context and makes collaboration easier.\n\n📝 Intro format:\n• Who are you & what do you do?\n• Where are you based?\n• One fun fact about you\n• How are you looking to contribute to Superteam MY?\n\nNo pressure to be perfect — just be you!"'),
  ('intro_example', '"✨ Example intro\n\nHey everyone! I''m Marianne 👋\nTogether with Han, we are Co-Leads of Superteam Malaysia!\n\n📍 Based in Kuala Lumpur and Network School\n🧑‍🎓 Fun fact: My first Solana project was building an AI Telegram trading bot, and that''s how I found myself in Superteam MY!\n🤝 Looking to contribute by:\n• Connecting builders with the right mentors, partners, and opportunities\n• Helping teams refine their story, demos, and go-to-market\n• Supporting members who want to go from \"building quietly\" → \"shipping publicly\"\n\nExcited to build alongside all of you — feel free to reach out anytime 🙌"')
ON CONFLICT (key) DO NOTHING;
```

**Step 2: Create `bot/src/db/supabase.js`**

```js
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

module.exports = supabase;
```

**Step 3: Create `bot/src/db/members.js`**

```js
const supabase = require('./supabase');

async function upsertMember(telegramId, username, firstName) {
  const { data, error } = await supabase
    .from('members')
    .upsert(
      { telegram_id: telegramId, username, first_name: firstName },
      { onConflict: 'telegram_id', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getMember(telegramId) {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

async function updateIntroStatus(telegramId, status, introMessageId = null) {
  const update = { intro_status: status };
  if (status === 'completed' || status === 'approved') {
    update.intro_completed_at = new Date().toISOString();
  }
  if (introMessageId) {
    update.intro_message_id = introMessageId;
  }

  const { data, error } = await supabase
    .from('members')
    .update(update)
    .eq('telegram_id', telegramId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function resetIntroStatus(telegramId) {
  const { data, error } = await supabase
    .from('members')
    .update({ intro_status: 'pending', intro_completed_at: null, intro_message_id: null })
    .eq('telegram_id', telegramId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getStats() {
  const { count: total } = await supabase.from('members').select('*', { count: 'exact', head: true });
  const { count: pending } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('intro_status', 'pending');
  const { count: completed } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('intro_status', 'completed');
  const { count: approved } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('intro_status', 'approved');

  return { total, pending, completed, approved };
}

async function logActivity(action, telegramId, details = {}) {
  const { error } = await supabase
    .from('activity_log')
    .insert({ action, telegram_id: telegramId, details });

  if (error) console.error('Failed to log activity:', error);
}

async function getSetting(key) {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) return null;
  return data.value;
}

async function setSetting(key, value) {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' });

  if (error) throw error;
}

module.exports = {
  upsertMember,
  getMember,
  updateIntroStatus,
  resetIntroStatus,
  getStats,
  logActivity,
  getSetting,
  setSetting,
};
```

**Step 4: Commit**

```bash
git add bot/supabase-schema.sql bot/src/db/
git commit -m "feat: add Supabase schema and database layer"
```

---

## Task 3: Utility Modules — Messages & Validation

**Files:**
- Create: `bot/src/utils/messages.js`
- Create: `bot/src/utils/validation.js`

**Step 1: Create `bot/src/utils/messages.js`**

```js
const { getSetting } = require('../db/members');

const DEFAULT_WELCOME = `👋 Welcome to Superteam MY!

To get started, please introduce yourself in the Intro Channel using this format 👇

This helps everyone get context and makes collaboration easier.

📝 Intro format:
• Who are you & what do you do?
• Where are you based?
• One fun fact about you
• How are you looking to contribute to Superteam MY?

No pressure to be perfect — just be you!`;

const DEFAULT_EXAMPLE = `✨ Example intro

Hey everyone! I'm Marianne 👋
Together with Han, we are Co-Leads of Superteam Malaysia!

📍 Based in Kuala Lumpur and Network School
🧑‍🎓 Fun fact: My first Solana project was building an AI Telegram trading bot, and that's how I found myself in Superteam MY!
🤝 Looking to contribute by:
• Connecting builders with the right mentors, partners, and opportunities
• Helping teams refine their story, demos, and go-to-market
• Supporting members who want to go from "building quietly" → "shipping publicly"

Excited to build alongside all of you — feel free to reach out anytime 🙌`;

async function getWelcomeMessage(introChannelId) {
  const custom = await getSetting('welcome_message');
  const welcome = custom || DEFAULT_WELCOME;
  const example = (await getSetting('intro_example')) || DEFAULT_EXAMPLE;

  return `${welcome}\n\n👉 Post your intro here: https://t.me/c/${String(introChannelId).replace('-100', '')}\n\n${example}`;
}

function getReminderMessage(introChannelId) {
  return `⏳ Hey! You haven't introduced yourself yet.\nPlease post your intro in the Intro Channel first, then you'll be able to chat here.\n\n👉 https://t.me/c/${String(introChannelId).replace('-100', '')}`;
}

function getCongratsMessage(firstName) {
  return `🎉 Thanks for introducing yourself, ${firstName}! You now have full access to the group. Welcome aboard!`;
}

function getIntroFeedbackMessage() {
  return `Thanks for your intro! Could you expand it a bit? Try to include:\n• Who you are & what you do\n• Where you're based\n• A fun fact\n• How you'd like to contribute\n\nNo pressure — just helps everyone get to know you better! 😊`;
}

module.exports = {
  getWelcomeMessage,
  getReminderMessage,
  getCongratsMessage,
  getIntroFeedbackMessage,
};
```

**Step 2: Create `bot/src/utils/validation.js`**

```js
const FORMAT_MARKERS = [
  /based\s+in/i,
  /fun\s+fact/i,
  /contribut/i,
  /looking\s+to/i,
  /who\s+(am\s+i|i\s+am|are\s+you)/i,
  /what\s+(i|do\s+you)\s+do/i,
  /i('m|\s+am)\s+/i,
];

function validateIntro(text) {
  if (!text || text.length < 50) {
    return { valid: false, reason: 'too_short' };
  }

  let markerCount = 0;
  for (const marker of FORMAT_MARKERS) {
    if (marker.test(text)) {
      markerCount++;
    }
  }

  if (markerCount < 2) {
    return { valid: false, reason: 'missing_format' };
  }

  return { valid: true };
}

module.exports = { validateIntro };
```

**Step 3: Commit**

```bash
git add bot/src/utils/
git commit -m "feat: add message templates and intro validation"
```

---

## Task 4: Join Handler

**Files:**
- Create: `bot/src/handlers/join.js`

**Step 1: Create `bot/src/handlers/join.js`**

```js
const config = require('../config');
const { upsertMember, getMember, logActivity } = require('../db/members');
const { getWelcomeMessage } = require('../utils/messages');

function setupJoinHandler(bot) {
  bot.on('new_chat_members', async (ctx) => {
    // Only handle joins in the main group
    if (ctx.chat.id !== config.mainGroupId) return;

    for (const member of ctx.message.new_chat_members) {
      // Skip bots
      if (member.is_bot) continue;

      try {
        // Check if user already has completed status (rejoin case)
        const existing = await getMember(member.id);
        if (existing && (existing.intro_status === 'completed' || existing.intro_status === 'approved')) {
          console.log(`Returning member ${member.id} (${member.username}) — already introduced`);
          continue;
        }

        // Upsert member record
        await upsertMember(member.id, member.username, member.first_name);

        // Restrict user in main group (mute)
        try {
          await ctx.restrictChatMember(member.id, {
            permissions: {
              can_send_messages: false,
              can_send_media_messages: false,
              can_send_polls: false,
              can_send_other_messages: false,
              can_add_web_page_previews: false,
              can_change_info: false,
              can_invite_users: false,
              can_pin_messages: false,
            },
          });
        } catch (err) {
          console.error(`Failed to restrict user ${member.id}:`, err.message);
        }

        // Try sending DM
        const welcomeMsg = await getWelcomeMessage(config.introChannelId);
        try {
          await ctx.telegram.sendMessage(member.id, welcomeMsg, { parse_mode: 'HTML' });
        } catch (dmError) {
          // DM blocked — send in-group and auto-delete after 60s
          console.log(`Cannot DM user ${member.id}, posting in-group`);
          const inGroupMsg = await ctx.reply(
            `👋 <a href="tg://user?id=${member.id}">${member.first_name || 'New member'}</a>, welcome!\n\n${welcomeMsg}`,
            { parse_mode: 'HTML' }
          );
          setTimeout(async () => {
            try {
              await ctx.deleteMessage(inGroupMsg.message_id);
            } catch {}
          }, 60000);
        }

        await logActivity('join', member.id, { username: member.username, first_name: member.first_name });
        console.log(`New member joined: ${member.id} (${member.username})`);
      } catch (err) {
        console.error(`Error handling new member ${member.id}:`, err);
      }
    }
  });
}

module.exports = { setupJoinHandler };
```

**Step 2: Commit**

```bash
git add bot/src/handlers/join.js
git commit -m "feat: add join handler with DM fallback and muting"
```

---

## Task 5: Intro Monitor

**Files:**
- Create: `bot/src/handlers/intro.js`

**Step 1: Create `bot/src/handlers/intro.js`**

```js
const config = require('../config');
const { getMember, updateIntroStatus, logActivity } = require('../db/members');
const { getCongratsMessage, getIntroFeedbackMessage } = require('../utils/messages');
const { validateIntro } = require('../utils/validation');

function setupIntroHandler(bot) {
  // Listen for messages in the intro channel
  bot.on('message', async (ctx, next) => {
    // Only handle messages in the intro channel
    if (ctx.chat.id !== config.introChannelId) return next();

    // Skip bot messages
    if (ctx.from.is_bot) return next();

    const text = ctx.message.text || ctx.message.caption || '';
    const telegramId = ctx.from.id;

    try {
      // Check if user already completed
      const member = await getMember(telegramId);
      if (member && (member.intro_status === 'completed' || member.intro_status === 'approved')) {
        return next();
      }

      // Validate the intro
      const validation = validateIntro(text);

      if (!validation.valid) {
        // Send gentle feedback
        const feedbackMsg = await ctx.reply(getIntroFeedbackMessage(), {
          reply_to_message_id: ctx.message.message_id,
        });
        // Auto-delete feedback after 60s to keep channel clean
        setTimeout(async () => {
          try { await ctx.deleteMessage(feedbackMsg.message_id); } catch {}
        }, 60000);
        return next();
      }

      // Mark as completed
      await updateIntroStatus(telegramId, 'completed', ctx.message.message_id);

      // Unrestrict in main group
      try {
        await ctx.telegram.restrictChatMember(config.mainGroupId, telegramId, {
          permissions: {
            can_send_messages: true,
            can_send_media_messages: true,
            can_send_polls: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true,
            can_invite_users: true,
          },
        });
      } catch (err) {
        console.error(`Failed to unrestrict user ${telegramId}:`, err.message);
      }

      // Send congrats
      const congratsMsg = await ctx.reply(
        getCongratsMessage(ctx.from.first_name || 'friend'),
        { reply_to_message_id: ctx.message.message_id }
      );

      await logActivity('intro_completed', telegramId, {
        username: ctx.from.username,
        message_id: ctx.message.message_id,
      });

      console.log(`Intro completed: ${telegramId} (${ctx.from.username})`);
    } catch (err) {
      console.error(`Error processing intro from ${telegramId}:`, err);
    }

    return next();
  });
}

module.exports = { setupIntroHandler };
```

**Step 2: Commit**

```bash
git add bot/src/handlers/intro.js
git commit -m "feat: add intro channel monitor with validation"
```

---

## Task 6: Enforcement Middleware

**Files:**
- Create: `bot/src/middleware/enforcement.js`

**Step 1: Create `bot/src/middleware/enforcement.js`**

```js
const config = require('../config');
const { getMember, getSetting, logActivity } = require('../db/members');
const { getReminderMessage } = require('../utils/messages');

function setupEnforcementMiddleware(bot) {
  bot.use(async (ctx, next) => {
    // Only enforce in main group
    if (!ctx.chat || ctx.chat.id !== config.mainGroupId) return next();

    // Only check text/media messages (not service messages, joins, etc.)
    if (!ctx.message || ctx.from.is_bot) return next();

    // Skip admin commands
    if (ctx.message.text && ctx.message.text.startsWith('/')) return next();

    const telegramId = ctx.from.id;

    try {
      // Check if user is admin (admins bypass enforcement)
      const chatMember = await ctx.telegram.getChatMember(config.mainGroupId, telegramId);
      if (['creator', 'administrator'].includes(chatMember.status)) {
        return next();
      }

      const member = await getMember(telegramId);

      // If member has completed or approved status, allow through
      if (member && (member.intro_status === 'completed' || member.intro_status === 'approved')) {
        return next();
      }

      // User hasn't introduced — enforce
      const mode = (await getSetting('enforcement_mode')) || config.enforcementMode;

      if (mode === 'auto_delete') {
        // Delete the message
        try {
          await ctx.deleteMessage(ctx.message.message_id);
        } catch (err) {
          console.error(`Failed to delete message from ${telegramId}:`, err.message);
        }

        // Send reminder (auto-delete after 30s)
        try {
          const reminder = await ctx.reply(
            getReminderMessage(config.introChannelId),
            { reply_to_message_id: ctx.message.message_id }
          );
          setTimeout(async () => {
            try { await ctx.deleteMessage(reminder.message_id); } catch {}
          }, 30000);
        } catch {}

        await logActivity('message_deleted', telegramId, { reason: 'no_intro' });
      }
      // In mute mode, user is already restricted — Telegram handles it
    } catch (err) {
      console.error(`Enforcement error for ${telegramId}:`, err);
      return next();
    }
  });
}

module.exports = { setupEnforcementMiddleware };
```

**Step 2: Commit**

```bash
git add bot/src/middleware/enforcement.js
git commit -m "feat: add configurable enforcement middleware"
```

---

## Task 7: Admin Commands

**Files:**
- Create: `bot/src/handlers/admin.js`

**Step 1: Create `bot/src/handlers/admin.js`**

```js
const config = require('../config');
const {
  getMember,
  updateIntroStatus,
  resetIntroStatus,
  getStats,
  logActivity,
  getSetting,
  setSetting,
} = require('../db/members');

function extractUserId(ctx) {
  // Check for reply to a message
  if (ctx.message.reply_to_message) {
    return ctx.message.reply_to_message.from.id;
  }
  // Check for @username or user ID in text
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length > 0) {
    const arg = args[0].replace('@', '');
    if (/^\d+$/.test(arg)) return Number(arg);
    // Username lookup not directly supported — return null
    return null;
  }
  return null;
}

async function isAdmin(ctx) {
  try {
    const chatMember = await ctx.telegram.getChatMember(config.mainGroupId, ctx.from.id);
    return ['creator', 'administrator'].includes(chatMember.status);
  } catch {
    return false;
  }
}

function setupAdminHandler(bot) {
  // /approve_user — manually approve a user
  bot.command('approve_user', async (ctx) => {
    if (!(await isAdmin(ctx))) {
      return ctx.reply('❌ This command is only available to admins.');
    }

    const targetId = extractUserId(ctx);
    if (!targetId) {
      return ctx.reply('Usage: /approve_user <user_id> or reply to a user\'s message');
    }

    try {
      const member = await getMember(targetId);
      if (!member) {
        return ctx.reply('❌ User not found in the database.');
      }

      await updateIntroStatus(targetId, 'approved');

      // Unrestrict in main group
      try {
        await ctx.telegram.restrictChatMember(config.mainGroupId, targetId, {
          permissions: {
            can_send_messages: true,
            can_send_media_messages: true,
            can_send_polls: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true,
            can_invite_users: true,
          },
        });
      } catch (err) {
        console.error(`Failed to unrestrict user ${targetId}:`, err.message);
      }

      await logActivity('admin_approve', targetId, { approved_by: ctx.from.id });
      return ctx.reply(`✅ User ${targetId} has been approved.`);
    } catch (err) {
      console.error('approve_user error:', err);
      return ctx.reply('❌ An error occurred.');
    }
  });

  // /reset_intro — reset a user's intro status
  bot.command('reset_intro', async (ctx) => {
    if (!(await isAdmin(ctx))) {
      return ctx.reply('❌ This command is only available to admins.');
    }

    const targetId = extractUserId(ctx);
    if (!targetId) {
      return ctx.reply('Usage: /reset_intro <user_id> or reply to a user\'s message');
    }

    try {
      await resetIntroStatus(targetId);

      // Re-restrict in main group
      try {
        await ctx.restrictChatMember(targetId, {
          permissions: {
            can_send_messages: false,
            can_send_media_messages: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false,
            can_change_info: false,
            can_invite_users: false,
            can_pin_messages: false,
          },
        });
      } catch (err) {
        console.error(`Failed to re-restrict user ${targetId}:`, err.message);
      }

      await logActivity('admin_reset', targetId, { reset_by: ctx.from.id });
      return ctx.reply(`✅ Intro status for user ${targetId} has been reset.`);
    } catch (err) {
      console.error('reset_intro error:', err);
      return ctx.reply('❌ An error occurred.');
    }
  });

  // /bot_status — show stats
  bot.command('bot_status', async (ctx) => {
    if (!(await isAdmin(ctx))) {
      return ctx.reply('❌ This command is only available to admins.');
    }

    try {
      const stats = await getStats();
      return ctx.reply(
        `📊 Bot Status\n\n` +
        `👥 Total members: ${stats.total}\n` +
        `⏳ Pending intro: ${stats.pending}\n` +
        `✅ Completed: ${stats.completed}\n` +
        `🔑 Admin approved: ${stats.approved}`
      );
    } catch (err) {
      console.error('bot_status error:', err);
      return ctx.reply('❌ An error occurred.');
    }
  });

  // /set_enforcement — change enforcement mode
  bot.command('set_enforcement', async (ctx) => {
    if (!(await isAdmin(ctx))) {
      return ctx.reply('❌ This command is only available to admins.');
    }

    const args = ctx.message.text.split(' ').slice(1);
    const mode = args[0];

    if (!mode || !['mute', 'auto_delete'].includes(mode)) {
      return ctx.reply('Usage: /set_enforcement <mute|auto_delete>');
    }

    try {
      await setSetting('enforcement_mode', mode);
      return ctx.reply(`✅ Enforcement mode set to: ${mode}`);
    } catch (err) {
      console.error('set_enforcement error:', err);
      return ctx.reply('❌ An error occurred.');
    }
  });
}

module.exports = { setupAdminHandler };
```

**Step 2: Commit**

```bash
git add bot/src/handlers/admin.js
git commit -m "feat: add admin commands (approve, reset, status, enforcement)"
```

---

## Task 8: Bot Entry Point

**Files:**
- Create: `bot/src/bot.js`

**Step 1: Create `bot/src/bot.js`**

```js
const { Telegraf } = require('telegraf');
const config = require('./config');
const { setupJoinHandler } = require('./handlers/join');
const { setupIntroHandler } = require('./handlers/intro');
const { setupAdminHandler } = require('./handlers/admin');
const { setupEnforcementMiddleware } = require('./middleware/enforcement');

const bot = new Telegraf(config.botToken);

// Register enforcement middleware first (runs on every message)
setupEnforcementMiddleware(bot);

// Register handlers
setupJoinHandler(bot);
setupIntroHandler(bot);
setupAdminHandler(bot);

// Error handling
bot.catch((err, ctx) => {
  console.error(`Bot error for ${ctx.updateType}:`, err);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Start bot
bot.launch().then(() => {
  console.log('🤖 Superteam Onboarding Bot is running!');
  console.log(`Main group: ${config.mainGroupId}`);
  console.log(`Intro channel: ${config.introChannelId}`);
  console.log(`Enforcement mode: ${config.enforcementMode}`);
});
```

**Step 2: Commit**

```bash
git add bot/src/bot.js
git commit -m "feat: add bot entry point wiring all modules"
```

---

## Task 9: Bot Dockerfile

**Files:**
- Create: `bot/Dockerfile`
- Create: `bot/.dockerignore`

**Step 1: Create `bot/Dockerfile`**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY src/ ./src/

CMD ["node", "src/bot.js"]
```

**Step 2: Create `bot/.dockerignore`**

```
node_modules
.env
*.md
```

**Step 3: Commit**

```bash
git add bot/Dockerfile bot/.dockerignore
git commit -m "feat: add bot Dockerfile"
```

---

## Task 10: Dashboard Scaffolding

**Files:**
- Create: `dashboard/` (Vite + React + TypeScript project)

**Step 1: Scaffold Vite project**

```bash
npm create vite@latest dashboard -- --template react-ts
cd dashboard
npm install
```

**Step 2: Install shadcn/ui dependencies**

```bash
npx shadcn@latest init
```

Follow prompts: TypeScript, Default style, slate base color, CSS variables yes.

**Step 3: Install Supabase + routing**

```bash
npm install @supabase/supabase-js react-router-dom
```

**Step 4: Add shadcn components**

```bash
npx shadcn@latest add button card table input badge tabs dialog select textarea separator avatar dropdown-menu
```

**Step 5: Create `dashboard/src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Step 6: Create `dashboard/.env.example`**

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

**Step 7: Commit**

```bash
git add dashboard/
git commit -m "feat: scaffold dashboard with Vite, React, shadcn, Supabase"
```

---

## Task 11: Dashboard Auth

**Files:**
- Create: `dashboard/src/pages/Login.tsx`
- Create: `dashboard/src/lib/auth.tsx`

**Step 1: Create `dashboard/src/lib/auth.tsx`**

Auth context provider with Supabase session management:

```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

**Step 2: Create `dashboard/src/pages/Login.tsx`**

Simple login form using shadcn components.

**Step 3: Commit**

```bash
git add dashboard/src/lib/auth.tsx dashboard/src/pages/Login.tsx
git commit -m "feat: add dashboard auth with Supabase"
```

---

## Task 12: Dashboard Pages

**Files:**
- Create: `dashboard/src/pages/Dashboard.tsx`
- Create: `dashboard/src/pages/Members.tsx`
- Create: `dashboard/src/pages/Settings.tsx`
- Create: `dashboard/src/pages/ActivityLog.tsx`

**Step 1: Dashboard page** — Stats cards (total, pending, completed, approved) + recent activity feed. Uses shadcn `Card` components. Fetches from `members` and `activity_log` tables.

**Step 2: Members page** — DataTable with columns: name, username, status (badge), joined date, actions (approve/reset dropdown). Uses shadcn `Table`, `Badge`, `DropdownMenu`. Search input filters by username/name.

**Step 3: Settings page** — Form with enforcement mode `Select`, textarea for welcome message, textarea for intro example, read-only channel IDs. Uses shadcn `Select`, `Textarea`, `Button`. Saves to `settings` table.

**Step 4: Activity Log page** — Table showing recent activity with action type, user, timestamp, details. Filterable by action type. Uses shadcn `Table`, `Select`.

**Step 5: Commit per page (4 commits)**

---

## Task 13: Dashboard App Shell & Routing

**Files:**
- Modify: `dashboard/src/App.tsx`
- Create: `dashboard/src/components/Layout.tsx`

**Step 1: Create Layout component** — Sidebar nav with links to Dashboard, Members, Settings, Activity Log. Header with sign-out button. Uses shadcn `Button`, `Separator`.

**Step 2: Update App.tsx** — React Router with `AuthProvider`, protected routes, Layout wrapper.

**Step 3: Commit**

```bash
git add dashboard/src/
git commit -m "feat: add dashboard layout, routing, and all pages"
```

---

## Task 14: Dashboard Dockerfile

**Files:**
- Create: `dashboard/Dockerfile`

**Step 1: Create multi-stage Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Step 2: Create `dashboard/nginx.conf`**

```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

**Step 3: Commit**

```bash
git add dashboard/Dockerfile dashboard/nginx.conf
git commit -m "feat: add dashboard Dockerfile with nginx"
```

---

## Task 15: Docker Compose & Root Config

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`

**Step 1: Create `docker-compose.yml`**

```yaml
version: '3.8'

services:
  bot:
    build: ./bot
    env_file: .env
    restart: unless-stopped

  dashboard:
    build: ./dashboard
    ports:
      - "3000:80"
    restart: unless-stopped
```

**Step 2: Create root `.env.example`**

Combined env vars for both services.

**Step 3: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: add docker-compose and root config"
```

---

## Task 16: README & Documentation

**Files:**
- Create: `README.md`

**Step 1: Write comprehensive README**

Sections:
- Overview
- Features
- Prerequisites (Node.js, Supabase account, Telegram bot token)
- Setup guide:
  1. Create Telegram bot via @BotFather
  2. Create Supabase project
  3. Run SQL schema
  4. Configure environment variables
  5. Get group/channel IDs
- Running locally
- Docker deployment
- Railway/Render deployment
- Admin commands reference
- Architecture overview
- Troubleshooting

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add comprehensive README with setup and deployment guides"
```

---

## Summary

| Task | Description | Est. |
|------|-------------|------|
| 1 | Bot scaffolding | 3 min |
| 2 | Supabase DB layer | 5 min |
| 3 | Messages & validation | 3 min |
| 4 | Join handler | 5 min |
| 5 | Intro monitor | 5 min |
| 6 | Enforcement middleware | 4 min |
| 7 | Admin commands | 5 min |
| 8 | Bot entry point | 2 min |
| 9 | Bot Dockerfile | 2 min |
| 10 | Dashboard scaffolding | 5 min |
| 11 | Dashboard auth | 5 min |
| 12 | Dashboard pages (4) | 15 min |
| 13 | App shell & routing | 5 min |
| 14 | Dashboard Dockerfile | 2 min |
| 15 | Docker Compose | 2 min |
| 16 | README & docs | 5 min |
