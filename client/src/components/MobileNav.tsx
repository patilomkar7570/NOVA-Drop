import React from 'react';
import {
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  History,
  Settings,
} from 'lucide-react';
import { NavPage } from '../types/index.js';
import { useTransfers } from '../context/TransferContext.js';

interface MobileNavProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentPage, onNavigate }) => {
  const { files } = useTransfers();
  const activeCount = files.filter(f => f.status === 'uploading' || f.status === 'downloading').length;

  const navItems: Array<{ id: NavPage; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'send', label: 'Send', icon: <ArrowUpRight className="w-5 h-5" /> },
    { id: 'receive', label: 'Receive', icon: <ArrowDownLeft className="w-5 h-5" /> },
    {
      id: 'transfers',
      label: 'Transfers',
      icon: <Activity className="w-5 h-5" />,
      badge: activeCount > 0 ? activeCount : undefined,
    },
    { id: 'history', label: 'History', icon: <History className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-sidebar)]/95 backdrop-blur-lg border-t border-[var(--border-subtle)] px-2 py-2 safe-area-inset-bottom">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive
                  ? 'text-[#7C3AED] font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[#7C3AED] text-white text-[10px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight font-medium">{item.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[#7C3AED] mt-0.5"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
