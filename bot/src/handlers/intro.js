const config = require('../config');
const { getMember, updateIntroStatus, logActivity } = require('../db/members');
const { getCongratsMessage, getIntroFeedbackMessage } = require('../utils/messages');
const { validateIntro } = require('../utils/validation');

function setupIntroHandler(bot) {
  bot.on('message', async (ctx, next) => {
    if (ctx.chat.id !== config.introChannelId) return next();
    if (ctx.from.is_bot) return next();

    const text = ctx.message.text || ctx.message.caption || '';
    const telegramId = ctx.from.id;

    try {
      const member = await getMember(telegramId);
      if (member && (member.intro_status === 'completed' || member.intro_status === 'approved')) {
        return next();
      }

      const validation = validateIntro(text);

      if (!validation.valid) {
        const feedbackMsg = await ctx.reply(getIntroFeedbackMessage(), {
          reply_to_message_id: ctx.message.message_id,
        });
        setTimeout(async () => {
          try { await ctx.deleteMessage(feedbackMsg.message_id); } catch {}
        }, 60000);
        return next();
      }

      await updateIntroStatus(telegramId, 'completed', ctx.message.message_id);

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
