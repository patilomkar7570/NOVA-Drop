import React from 'react';
import { NavPage } from '../types/index.js';

interface HeaderProps {
  currentPage: NavPage;
}

const PAGE_META: Record<NavPage, { title: string; subtitle: string }> = {
  overview: {
    title: 'Overview',
    subtitle: 'System dashboard, fast file transfer controls and storage usage.',
  },
  send: {
    title: 'Send Files',
    subtitle: 'Stream original, uncompressed files directly to receiving devices.',
  },
  receive: {
    title: 'Receive Files',
    subtitle: 'Enter a 6-digit pairing code to download incoming files directly.',
  },
  transfers: {
    title: 'Active Transfers',
    subtitle: 'Real-time transfer progress, streaming speed and backpressure metrics.',
  },
  history: {
    title: 'Transfer History',
    subtitle: 'Audit log of completed, verified and previous transfers.',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Manage local temporary storage, security policies and appearance.',
  },
};

export const Header: React.FC<HeaderProps> = ({ currentPage }) => {
  const meta = PAGE_META[currentPage] || PAGE_META.overview;

  return (
    <header className="hidden md:flex h-20 px-8 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)]/80 backdrop-blur-md items-center justify-between shrink-0 sticky top-0 z-20 transition-colors">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          {meta.title}
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{meta.subtitle}</p>
      </div>

      <div className="flex items-center space-x-3">
        {/* Subtle, elegant indicator */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-medium">
          <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
          <span>Ready</span>
        </div>
      </div>
    </header>
  );
};
