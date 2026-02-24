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
