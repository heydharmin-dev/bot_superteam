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
  console.log('\u{1F916} Superteam Onboarding Bot is running!');
  console.log(`Main group: ${config.mainGroupId}`);
  console.log(`Intro channel: ${config.introChannelId}`);
  console.log(`Enforcement mode: ${config.enforcementMode}`);
});
