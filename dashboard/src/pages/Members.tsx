import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Member {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  intro_status: string;
  joined_at: string;
  intro_completed_at: string | null;
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select('*')
      .order('joined_at', { ascending: false });
    setMembers(data || []);
  };

  useEffect(() => { fetchMembers(); }, []);

  const filteredMembers = members.filter((m) =>
    (m.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
    String(m.telegram_id).includes(search)
  );

  const updateStatus = async (telegramId: number, status: string) => {
    await supabase
      .from('members')
      .update({
        intro_status: status,
        intro_completed_at: status === 'approved' ? new Date().toISOString() : null,
      })
      .eq('telegram_id', telegramId);
    fetchMembers();
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default' as const;
      case 'approved': return 'secondary' as const;
      default: return 'destructive' as const;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Members</h1>
      <Input
        placeholder="Search by name, username, or ID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Telegram ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.first_name || '\u2014'}</TableCell>
                <TableCell>{member.username ? `@${member.username}` : '\u2014'}</TableCell>
                <TableCell className="font-mono">{member.telegram_id}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(member.intro_status)}>
                    {member.intro_status}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(member.joined_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">Actions</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => updateStatus(member.telegram_id, 'approved')}>
                        Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatus(member.telegram_id, 'pending')}>
                        Reset Intro
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredMembers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No members found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
