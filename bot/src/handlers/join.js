const config = require('../config');
const { upsertMember, getMember, logActivity } = require('../db/members');
const { getWelcomeMessage } = require('../utils/messages');

function setupJoinHandler(bot) {
  bot.on('new_chat_members', async (ctx) => {
    if (ctx.chat.id !== config.mainGroupId) return;

    for (const member of ctx.message.new_chat_members) {
      if (member.is_bot) continue;

      try {
        const existing = await getMember(member.id);
        if (existing && (existing.intro_status === 'completed' || existing.intro_status === 'approved')) {
          console.log(`Returning member ${member.id} (${member.username}) — already introduced`);
          continue;
        }

        await upsertMember(member.id, member.username, member.first_name);

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

        const welcomeMsg = await getWelcomeMessage(config.introChannelId);
        try {
          await ctx.telegram.sendMessage(member.id, welcomeMsg, { parse_mode: 'HTML' });
        } catch (dmError) {
          console.log(`Cannot DM user ${member.id}, posting in-group`);
          const inGroupMsg = await ctx.reply(
            `\u{1F44B} <a href="tg://user?id=${member.id}">${member.first_name || 'New member'}</a>, welcome!\n\n${welcomeMsg}`,
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
