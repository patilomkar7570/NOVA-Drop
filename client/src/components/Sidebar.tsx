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

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { files } = useTransfers();
  const activeCount = files.filter(f => f.status === 'uploading' || f.status === 'downloading').length;

  const navItems: Array<{ id: NavPage; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'send', label: 'Send', icon: <ArrowUpRight className="w-5 h-5" /> },
    { id: 'receive', label: 'Receive', icon: <ArrowDownLeft className="w-5 h-5" /> },
    {
      id: 'transfers',
      label: 'Active Transfers',
      icon: <Activity className="w-5 h-5" />,
      badge: activeCount > 0 ? activeCount : undefined,
    },
    { id: 'history', label: 'History', icon: <History className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="hidden md:flex w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex-col justify-between shrink-0 select-none transition-colors">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex items-center justify-center p-2 shadow-sm">
              <img
                src="/logo.png"
                alt="NOVA Drop"
                className="w-full h-full object-contain dark:invert transition-all"
              />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">
                  NOVA
                </span>
                <span className="font-extrabold text-lg text-[#8B5CF6]">
                  Drop
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#7C3AED]/15 text-[#8B5CF6]">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] font-medium">PC Web Edition</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/25 font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-subtle)]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={isActive ? 'text-white' : 'text-[#8B5CF6]'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white text-[#7C3AED]' : 'bg-[#7C3AED]/20 text-[#8B5CF6]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Marketing & Privacy Badge */}
      <div className="p-4 m-4 rounded-2xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-subtle)] p-1.5 flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="NOVA"
              className="w-full h-full object-contain dark:invert"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-[var(--text-primary)]">Direct Transfer</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] truncate">Zero cloud. Original quality.</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
