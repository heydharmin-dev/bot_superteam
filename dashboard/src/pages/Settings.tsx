import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Settings() {
  const [enforcementMode, setEnforcementMode] = useState('mute');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [introExample, setIntroExample] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data: settings } = await supabase.from('settings').select('*');
        if (settings) {
          for (const s of settings) {
            if (s.key === 'enforcement_mode') setEnforcementMode(s.value);
            if (s.key === 'welcome_message') setWelcomeMessage(s.value);
            if (s.key === 'intro_example') setIntroExample(s.value);
          }
        }
      } catch {
        // Supabase not connected
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await supabase.from('settings').upsert([
      { key: 'enforcement_mode', value: enforcementMode },
      { key: 'welcome_message', value: welcomeMessage },
      { key: 'intro_example', value: introExample },
    ], { onConflict: 'key' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Enforcement Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={enforcementMode} onValueChange={setEnforcementMode}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mute">Mute (restrict permissions)</SelectItem>
              <SelectItem value="auto_delete">Auto-delete messages</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Welcome Message</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={8}
            placeholder="Enter welcome message..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Intro Example</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={introExample}
            onChange={(e) => setIntroExample(e.target.value)}
            rows={10}
            placeholder="Enter example intro..."
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        {saved && <span className="text-sm text-green-600">Settings saved!</span>}
      </div>
    </div>
  );
}
