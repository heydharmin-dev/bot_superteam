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
