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
