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
  if (ctx.message.reply_to_message) {
    return ctx.message.reply_to_message.from.id;
  }
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length > 0) {
    const arg = args[0].replace('@', '');
    if (/^\d+$/.test(arg)) return Number(arg);
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
  bot.command('approve_user', async (ctx) => {
    if (!(await isAdmin(ctx))) {
      return ctx.reply('\u274C This command is only available to admins.');
    }

    const targetId = extractUserId(ctx);
    if (!targetId) {
      return ctx.reply('Usage: /approve_user <user_id> or reply to a user\'s message');
    }

    try {
      const member = await getMember(targetId);
      if (!member) {
        return ctx.reply('\u274C User not found in the database.');
      }

      await updateIntroStatus(targetId, 'approved');

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
      return ctx.reply(`\u2705 User ${targetId} has been approved.`);
    } catch (err) {
      console.error('approve_user error:', err);
      return ctx.reply('\u274C An error occurred.');
    }
  });

  bot.command('reset_intro', async (ctx) => {
    if (!(await isAdmin(ctx))) {
      return ctx.reply('\u274C This command is only available to admins.');
    }

    const targetId = extractUserId(ctx);
    if (!targetId) {
      return ctx.reply('Usage: /reset_intro <user_id> or reply to a user\'s message');
    }

    try {
      await resetIntroStatus(targetId);

      try {
        await ctx.telegram.restrictChatMember(config.mainGroupId, targetId, {
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
      return ctx.reply(`\u2705 Intro status for user ${targetId} has been reset.`);
    } catch (err) {
      console.error('reset_intro error:', err);
      return ctx.reply('\u274C An error occurred.');
    }
  });

  bot.command('bot_status', async (ctx) => {
    if (!(await isAdmin(ctx))) {
      return ctx.reply('\u274C This command is only available to admins.');
    }

    try {
      const stats = await getStats();
      return ctx.reply(
        `\u{1F4CA} Bot Status\n\n` +
        `\u{1F465} Total members: ${stats.total}\n` +
        `\u23F3 Pending intro: ${stats.pending}\n` +
        `\u2705 Completed: ${stats.completed}\n` +
        `\u{1F511} Admin approved: ${stats.approved}`
      );
    } catch (err) {
      console.error('bot_status error:', err);
      return ctx.reply('\u274C An error occurred.');
    }
  });

  bot.command('set_enforcement', async (ctx) => {
    if (!(await isAdmin(ctx))) {
      return ctx.reply('\u274C This command is only available to admins.');
    }

    const args = ctx.message.text.split(' ').slice(1);
    const mode = args[0];

    if (!mode || !['mute', 'auto_delete'].includes(mode)) {
      return ctx.reply('Usage: /set_enforcement <mute|auto_delete>');
    }

    try {
      await setSetting('enforcement_mode', mode);
      return ctx.reply(`\u2705 Enforcement mode set to: ${mode}`);
    } catch (err) {
      console.error('set_enforcement error:', err);
      return ctx.reply('\u274C An error occurred.');
    }
  });
}

module.exports = { setupAdminHandler };
