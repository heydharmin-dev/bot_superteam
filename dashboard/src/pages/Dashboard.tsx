import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Stats {
  total: number;
  pending: number;
  completed: number;
  approved: number;
}

interface Activity {
  id: string;
  action: string;
  telegram_id: number;
  details: unknown;
  created_at: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, completed: 0, approved: 0 });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { count: total } = await supabase.from('members').select('*', { count: 'exact', head: true });
      const { count: pending } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('intro_status', 'pending');
      const { count: completed } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('intro_status', 'completed');
      const { count: approved } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('intro_status', 'approved');
      setStats({ total: total || 0, pending: pending || 0, completed: completed || 0, approved: approved || 0 });

      const { data: activity } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentActivity(activity || []);
    }
    fetchData();
  }, []);

  const statCards = [
    { title: 'Total Members', value: stats.total, icon: '\u{1F465}' },
    { title: 'Pending Intro', value: stats.pending, icon: '\u{23F3}' },
    { title: 'Completed', value: stats.completed, icon: '\u{2705}' },
    { title: 'Admin Approved', value: stats.approved, icon: '\u{1F511}' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <span className="text-2xl">{stat.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <span className="font-medium">{activity.action}</span>
                    <span className="text-muted-foreground ml-2">User: {activity.telegram_id}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(activity.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
