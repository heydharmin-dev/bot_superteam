const { Telegraf } = require('telegraf');
const config = require('./config');
const { getSetting } = require('./db/members');
const { setupJoinHandler } = require('./handlers/join');
const { setupIntroHandler } = require('./handlers/intro');
const { setupAdminHandler } = require('./handlers/admin');
const { setupEnforcementMiddleware } = require('./middleware/enforcement');

async function loadConfigFromDB() {
  try {
    const botToken = await getSetting('bot_token');
    const mainGroupId = await getSetting('main_group_id');
    const introChannelId = await getSetting('intro_channel_id');
    const enforcementMode = await getSetting('enforcement_mode');

    if (botToken) config.botToken = botToken;
    if (mainGroupId) config.mainGroupId = Number(mainGroupId);
    if (introChannelId) config.introChannelId = Number(introChannelId);
    if (enforcementMode) config.enforcementMode = enforcementMode;

    console.log('✅ Config loaded from database');
  } catch (err) {
    console.warn('⚠️ Could not load config from database, using .env fallback:', err.message);
  }
}

async function start() {
  // Load config from Supabase (overrides .env values)
  await loadConfigFromDB();

  // Validate required config after DB load
  if (!config.botToken) {
    throw new Error('Bot token not configured! Set it in the admin dashboard or BOT_TOKEN env var.');
  }
  if (!config.mainGroupId) {
    throw new Error('Main group ID not configured! Set it in the admin dashboard or MAIN_GROUP_ID env var.');
  }
  if (!config.introChannelId) {
    throw new Error('Intro channel ID not configured! Set it in the admin dashboard or INTRO_CHANNEL_ID env var.');
  }

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
  await bot.launch();
  console.log('🤖 Superteam Onboarding Bot is running!');
  console.log(`Main group: ${config.mainGroupId}`);
  console.log(`Intro channel: ${config.introChannelId}`);
  console.log(`Enforcement mode: ${config.enforcementMode}`);
}

start().catch((err) => {
  console.error('❌ Failed to start bot:', err.message);
  process.exit(1);
});
