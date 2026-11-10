import React from 'react';
import { NavPage } from '../types/index.js';

interface MobileHeaderProps {
  currentPage: NavPage;
}

export const MobileHeader: React.FC<MobileHeaderProps> = () => {
  return (
    <header className="md:hidden h-14 px-4 bg-[var(--bg-sidebar)] border-b border-[var(--border-subtle)] flex items-center justify-between sticky top-0 z-30 transition-colors">
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-lg bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] p-1 flex items-center justify-center shadow-sm">
          <img
            src="/logo.png"
            alt="NOVA Drop"
            className="w-full h-full object-contain dark:invert"
          />
        </div>
        <div className="flex items-center space-x-1">
          <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">
            NOVA
          </span>
          <span className="font-extrabold text-base text-[#8B5CF6]">
            Drop
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
        <span>Local Wi-Fi</span>
      </div>
    </header>
  );
};
