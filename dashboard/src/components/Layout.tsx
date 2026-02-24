import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '\u{1F4CA}' },
  { to: '/members', label: 'Members', icon: '\u{1F465}' },
  { to: '/settings', label: 'Settings', icon: '\u{2699}\u{FE0F}' },
  { to: '/activity', label: 'Activity Log', icon: '\u{1F4CB}' },
];

export default function Layout() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-muted/30 p-4 flex flex-col">
        <div className="mb-6">
          <h2 className="text-lg font-bold">Superteam Bot</h2>
          <p className="text-sm text-muted-foreground">Admin Dashboard</p>
        </div>
        <Separator className="mb-4" />
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Separator className="my-4" />
        <Button variant="outline" onClick={signOut} className="w-full">
          Sign Out
        </Button>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
