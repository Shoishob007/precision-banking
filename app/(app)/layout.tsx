'use client';

import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ReceiptText,
  LogOut,
  Moon,
  Sun,
  UserCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const pathname = usePathname();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight, path: '/transactions' },
    { id: 'ledger', label: 'Ledger', icon: ReceiptText, path: '/ledger' },
  ];

  const activeTab = navItems.find(item => item.path === pathname)?.id || 'dashboard';

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-surface text-on-surface transition-colors duration-300">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex flex-col w-64 fixed left-0 top-0 h-full bg-surface-container-low border-r border-outline-variant/10 z-50">
          <div className="px-6 py-8">
            <Link href="/dashboard" className="text-xl font-black text-on-surface tracking-tighter">Precision Banking</Link>
          </div>

          <div className="px-4 mb-8">
            <div className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-lg shadow-sm">
              <div className="h-10 w-10 bg-primary-container rounded-full flex items-center justify-center text-primary overflow-hidden">
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Julian'}`}
                  alt="User Avatar"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="overflow-hidden">
                <p className="font-sans text-[10px] font-black uppercase tracking-widest text-on-surface truncate">{user?.name || 'Julian Vance'}</p>
                <p className="text-[10px] text-on-surface-variant font-mono truncate">{user?.email || 'julian@vance.corp'}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.path}
                className={cn(
                  "flex items-center w-full gap-3 px-4 py-3 font-sans text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg",
                  pathname === item.path
                    ? "text-primary bg-primary-container/30"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                )}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 mt-auto border-t border-outline-variant/10">
            <button
              onClick={logout}
              className="flex items-center w-full gap-3 px-4 py-3 text-error font-sans text-[10px] font-bold uppercase tracking-widest hover:bg-error-container/10 transition-all rounded-lg"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 lg:ml-64 flex flex-col">
          {/* Top Bar */}
          <header className="flex justify-between items-center px-8 py-4 w-full bg-surface/80 backdrop-blur-md sticky top-0 z-40 border-b border-outline-variant/10">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold tracking-tighter text-on-surface capitalize">
                {activeTab === 'dashboard' ? 'Account Portfolio' : activeTab === 'transactions' ? 'Move Money' : 'Transaction Ledger'}
              </h2>
              <div className="flex items-center gap-2 bg-secondary-container/20 px-2 py-1 rounded-full">
                <span className="h-2 w-2 rounded-full bg-secondary animate-pulse"></span>
                <span className="text-[10px] font-bold text-on-secondary-container uppercase tracking-tighter">Live WebSocket</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-widest">System Status</span>
                <span className="text-xs font-bold text-secondary uppercase">Operational</span>
              </div>
              <div className="flex gap-3 text-on-surface-variant">
                <button
                  onClick={toggleTheme}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                  title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                  <UserCircle size={20} />
                </button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {children}
          </div>

          {/* Mobile Bottom Nav */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-xl border-t border-outline-variant/10 z-50">
            <div className="flex justify-around items-center px-2 py-3">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.path}
                  className={cn(
                    "flex flex-col items-center gap-1",
                    pathname === item.path ? "text-primary" : "text-on-surface-variant"
                  )}
                >
                  <item.icon size={20} />
                  <span className="text-[10px] font-bold uppercase">{item.label}</span>
                </Link>
              ))}
              <button
                onClick={logout}
                className="flex flex-col items-center gap-1 text-error"
              >
                <LogOut size={20} />
                <span className="text-[10px] font-medium uppercase">Exit</span>
              </button>
            </div>
          </nav>
        </main>
      </div>
    </ProtectedRoute>
  );
}
