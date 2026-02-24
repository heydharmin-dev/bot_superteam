const config = require('../config');
const { getMember, getSetting, logActivity } = require('../db/members');
const { getReminderMessage } = require('../utils/messages');

function setupEnforcementMiddleware(bot) {
  bot.use(async (ctx, next) => {
    if (!ctx.chat || ctx.chat.id !== config.mainGroupId) return next();
    if (!ctx.message || ctx.from.is_bot) return next();
    if (ctx.message.text && ctx.message.text.startsWith('/')) return next();

    const telegramId = ctx.from.id;

    try {
      const chatMember = await ctx.telegram.getChatMember(config.mainGroupId, telegramId);
      if (['creator', 'administrator'].includes(chatMember.status)) {
        return next();
      }

      const member = await getMember(telegramId);

      if (member && (member.intro_status === 'completed' || member.intro_status === 'approved')) {
        return next();
      }

      const mode = (await getSetting('enforcement_mode')) || config.enforcementMode;

      if (mode === 'auto_delete') {
        try {
          await ctx.deleteMessage(ctx.message.message_id);
        } catch (err) {
          console.error(`Failed to delete message from ${telegramId}:`, err.message);
        }

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
    } catch (err) {
      console.error(`Enforcement error for ${telegramId}:`, err);
      return next();
    }
  });
}

module.exports = { setupEnforcementMiddleware };
