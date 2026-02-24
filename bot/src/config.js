require('dotenv').config();

// Only Supabase credentials are required in .env
const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,

  // These can be overridden from the admin dashboard (Supabase settings table)
  // .env values serve as initial defaults
  botToken: process.env.BOT_TOKEN || null,
  mainGroupId: process.env.MAIN_GROUP_ID ? Number(process.env.MAIN_GROUP_ID) : null,
  introChannelId: process.env.INTRO_CHANNEL_ID ? Number(process.env.INTRO_CHANNEL_ID) : null,
  enforcementMode: process.env.ENFORCEMENT_MODE || 'mute',
};

// Only Supabase credentials are strictly required in .env
const required = ['supabaseUrl', 'supabaseServiceKey'];
for (const key of required) {
  if (!config[key]) {
    throw new Error(`Missing required environment variable for: ${key}`);
  }
}

module.exports = config;
