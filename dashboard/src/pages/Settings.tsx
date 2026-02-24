import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Settings() {
  const [botToken, setBotToken] = useState('');
  const [mainGroupId, setMainGroupId] = useState('');
  const [introChannelId, setIntroChannelId] = useState('');
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
            if (s.key === 'bot_token') setBotToken(s.value);
            if (s.key === 'main_group_id') setMainGroupId(s.value);
            if (s.key === 'intro_channel_id') setIntroChannelId(s.value);
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
    try {
      await supabase.from('settings').upsert([
        { key: 'bot_token', value: botToken },
        { key: 'main_group_id', value: mainGroupId },
        { key: 'intro_channel_id', value: introChannelId },
        { key: 'enforcement_mode', value: enforcementMode },
        { key: 'welcome_message', value: welcomeMessage },
        { key: 'intro_example', value: introExample },
      ], { onConflict: 'key' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // handle error
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Telegram Configuration</CardTitle>
          <CardDescription>
            Configure your Telegram bot credentials and group IDs. Changes to the bot token require a bot restart.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="botToken">Bot Token</Label>
            <Input
              id="botToken"
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="Enter bot token from @BotFather"
            />
            <p className="text-xs text-muted-foreground">
              Requires bot restart to take effect. Get this from <span className="font-mono">@BotFather</span> on Telegram.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mainGroupId">Main Group ID</Label>
              <Input
                id="mainGroupId"
                value={mainGroupId}
                onChange={(e) => setMainGroupId(e.target.value)}
                placeholder="e.g. -1001234567890"
              />
              <p className="text-xs text-muted-foreground">
                The Telegram group where members chat.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="introChannelId">Intro Channel ID</Label>
              <Input
                id="introChannelId"
                value={introChannelId}
                onChange={(e) => setIntroChannelId(e.target.value)}
                placeholder="e.g. -1009876543210"
              />
              <p className="text-xs text-muted-foreground">
                The channel where new members post intros.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enforcement Mode</CardTitle>
          <CardDescription>
            How the bot handles messages from members who haven't introduced themselves.
          </CardDescription>
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
          <CardDescription>
            The message sent to new members when they join the group.
          </CardDescription>
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
          <CardDescription>
            An example introduction shown to new members as a template.
          </CardDescription>
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
