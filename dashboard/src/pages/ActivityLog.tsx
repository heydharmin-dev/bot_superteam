import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Activity {
  id: string;
  action: string;
  telegram_id: number;
  details: unknown;
  created_at: string;
}

const ACTION_TYPES = ['all', 'join', 'intro_completed', 'message_deleted', 'admin_approve', 'admin_reset'];

export default function ActivityLog() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function fetchActivities() {
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('action', filter);
      }

      const { data } = await query;
      setActivities(data || []);
    }
    fetchActivities();
  }, [filter]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Activity Log</h1>
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Filter by action" />
        </SelectTrigger>
        <SelectContent>
          {ACTION_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {type === 'all' ? 'All Actions' : type.replace(/_/g, ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Badge variant="outline">{a.action}</Badge>
                </TableCell>
                <TableCell className="font-mono">{a.telegram_id}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                  {JSON.stringify(a.details)}
                </TableCell>
                <TableCell>{new Date(a.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {activities.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No activity found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
