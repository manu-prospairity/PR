import { useUser } from '../hooks/use-user';
import { Link, useLocation } from 'wouter';
import { BarChart3, Home, LogOut, TrendingUp, Trophy, User } from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useUser();
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  const menuItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/predictions', icon: TrendingUp, label: 'My Predictions' },
    { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { href: '/stats', icon: BarChart3, label: 'Statistics' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        {/* Logo area */}
        <div className="h-16 flex items-center px-6 border-b">
          <span className="text-xl font-semibold">Stock Predictions</span>
        </div>

        {/* Navigation */}
        <nav className="mt-6">
          {menuItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors ${
                isActive(item.href) ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' : ''
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User area */}
        <div className="absolute bottom-0 w-64 border-t">
          {user ? (
            <div className="p-4">
              <div className="flex items-center mb-4">
                <User className="w-8 h-8 bg-gray-200 rounded-full p-1" />
                <div className="ml-3">
                  <p className="text-sm font-medium">{user.username}</p>
                  <p className="text-xs text-gray-500">Logged in</p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-red-600 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Logout
              </button>
            </div>
          ) : (
            <div className="p-4">
              <Link 
                href="/login"
                className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Login
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
} 