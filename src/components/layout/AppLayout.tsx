import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Send, ArrowLeftRight, Wallet, Users, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/nueva-operacion', icon: Send, label: 'Nueva Operación' },
  { to: '/transacciones', icon: ArrowLeftRight, label: 'Transacciones' },
  { to: '/inventario', icon: Wallet, label: 'Inventario' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/configuracion', icon: Settings, label: 'Configuración' },
];

const AppLayout = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-60 bg-card border-r border-border flex flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <h1 className="text-xl font-bold text-primary tracking-tight">💱 RemesaPro</h1>
          <p className="text-xs text-muted-foreground mt-1">Sistema de Remesas Offline</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          {user && (
            <>
              <p className="text-xs text-muted-foreground text-center truncate">{user.email}</p>
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={signOut}>
                <LogOut size={14} className="mr-1" /> Cerrar Sesión
              </Button>
            </>
          )}
          <p className="text-xs text-muted-foreground text-center">100% Offline • v1.0</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
