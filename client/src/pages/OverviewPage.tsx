import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  HardDrive,
  ShieldCheck,
  Server,
  Zap,
  CheckCircle2,
  Trash2,
  Lock,
  EyeOff,
  Smartphone,
  Copy,
  Check,
} from 'lucide-react';
import { NavPage } from '../types/index.js';
import { useTransfers } from '../context/TransferContext.js';
import { formatBytes, formatDate } from '../utils/formatters.js';
import * as api from '../services/api.js';

interface OverviewPageProps {
  onNavigate: (page: NavPage) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const { systemStatus, history, refreshSystemStatus } = useTransfers();
  const [clearingStorage, setClearingStorage] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);
  const [copiedWifi, setCopiedWifi] = useState(false);

  const wifiUrl = systemStatus?.localWifiUrl || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000` : 'http://localhost:3000');

  const copyWifiUrl = () => {
    navigator.clipboard.writeText(wifiUrl);
    setCopiedWifi(true);
    setTimeout(() => setCopiedWifi(false), 2000);
  };

  const handleClearTemp = async () => {
    try {
      setClearingStorage(true);
      const res = await api.clearTempStorage();
      setClearMessage(`Freed ${formatBytes(res.bytesFreed)} across ${res.filesRemoved} files.`);
      await refreshSystemStatus();
      setTimeout(() => setClearMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setClearingStorage(false);
    }
  };

  const recentTransfers = history.slice(0, 5);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--bg-card)] via-[var(--bg-card-subtle)] to-[var(--bg-card)] border border-[var(--border-card)] p-8 shadow-sm">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#7C3AED]/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#7C3AED]/15 border border-[#7C3AED]/30 text-xs font-semibold text-[#8B5CF6] mb-4">
            <Zap className="w-3.5 h-3.5" />
            <span>High-Speed Local File Transfer Engine</span>
          </div>
          <h2 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
            Your files. Your devices. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED]">
              Your network.
            </span>
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed">
            NOVA Drop transfers files at the maximum practical speed between your devices. No cloud storage, no compression, no data modification, and no accounts. Byte-for-byte fidelity guaranteed.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <button
              onClick={() => onNavigate('send')}
              className="inline-flex items-center space-x-2.5 px-6 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-sm transition-all shadow-lg shadow-[#7C3AED]/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Send Files</span>
            </button>
            <button
              onClick={() => onNavigate('receive')}
              className="inline-flex items-center space-x-2.5 px-6 py-3 rounded-xl bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-semibold text-sm transition-all border border-[var(--border-subtle)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Receive Files</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile & Wi-Fi Fast Connect Bar */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[#7C3AED]/30 shadow-md shadow-[#7C3AED]/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center shrink-0 text-[#8B5CF6]">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8B5CF6]">
                Connect Phones & Tablets
              </span>
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
              Open on any phone (iOS / Android) on your local Wi-Fi:
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Paste into Safari/Chrome or the NOVA Drop Android APK to transfer files directly.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-[var(--bg-card-subtle)] p-2 rounded-xl border border-[var(--border-subtle)]">
          <code className="text-xs font-mono font-bold text-[#8B5CF6] px-2 truncate max-w-[240px]">
            {wifiUrl}
          </code>
          <button
            onClick={copyWifiUrl}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold transition-colors shadow-sm shrink-0"
          >
            {copiedWifi ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedWifi ? 'Copied' : 'Copy URL'}</span>
          </button>
        </div>
      </div>

      {/* Metrics & Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Server & Network Status */}
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-[var(--text-muted)] mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Local & Wi-Fi Engine</span>
              <Server className="w-4 h-4 text-[#8B5CF6]" />
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse"></div>
              <span className="text-lg font-bold text-[var(--text-primary)]">Ready for Transfers</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              Active on your local network. Connect phones, tablets, or other PCs on the same Wi-Fi with zero configuration.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-mono text-[var(--text-primary)] font-medium">
              {systemStatus?.localWifiUrl || `http://localhost:${systemStatus?.port || 3000}`}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] font-semibold">
              Wi-Fi Active
            </span>
          </div>
        </div>

        {/* Temporary Storage Card */}
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-[var(--text-muted)] mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Temporary Storage</span>
              <HardDrive className="w-4 h-4 text-[#8B5CF6]" />
            </div>
            <div className="text-2xl font-extrabold text-[var(--text-primary)]">
              {formatBytes(systemStatus?.tempStorageBytes || 0)}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {systemStatus?.tempStorageFileCount || 0} temporary transfer file(s) on disk
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            {clearMessage ? (
              <span className="text-xs text-[#10B981] font-medium">{clearMessage}</span>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">Auto-cleans on session completion</span>
            )}
            <button
              onClick={handleClearTemp}
              disabled={clearingStorage || (systemStatus?.tempStorageFileCount || 0) === 0}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/20 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Temp</span>
            </button>
          </div>
        </div>

        {/* Privacy & Security Audit */}
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-[var(--text-muted)] mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Privacy Engine</span>
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="text-lg font-bold text-[var(--text-primary)] flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
              <span>100% Privacy Enforced</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              No cloud accounts. No external telemetry. Original byte fidelity guaranteed.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-2 text-[11px] text-[#8B5CF6]">
            <span className="flex items-center space-x-1">
              <EyeOff className="w-3 h-3 text-[#10B981]" />
              <span>Zero Tracking</span>
            </span>
            <span className="flex items-center space-x-1">
              <Lock className="w-3 h-3 text-[#10B981]" />
              <span>Pairing Shield</span>
            </span>
          </div>
        </div>
      </div>

      {/* Privacy Commitments Detail */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-sm">
        <h3 className="text-base font-bold text-[var(--text-primary)] mb-4 flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-[#8B5CF6]" />
          <span>NOVA Drop Privacy & Fidelity Guarantees</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)]">
            <div className="font-semibold text-[var(--text-primary)] text-sm mb-1">0% Compression</div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Images, videos and docs are never re-encoded or downscaled. Every byte is preserved identically.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)]">
            <div className="font-semibold text-[var(--text-primary)] text-sm mb-1">Local-First Operation</div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Transfers stream through your local loopback. No files ever touch third-party cloud servers.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)]">
            <div className="font-semibold text-[var(--text-primary)] text-sm mb-1">Integrity Validation</div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Every transferred file is cryptographically hashed and verified before being marked complete.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)]">
            <div className="font-semibold text-[var(--text-primary)] text-sm mb-1">Brute-Force Protected</div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Session pairing codes expire automatically and are guarded against rapid automated guessing.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Transfers Summary */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[var(--text-primary)]">Recent Transfers</h3>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs font-semibold text-[#8B5CF6] hover:text-[#7C3AED] transition-colors"
          >
            View Full History →
          </button>
        </div>

        {recentTransfers.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-muted)] text-sm">
            <p>No transfers recorded yet.</p>
            <p className="text-xs mt-1 text-[var(--text-muted)]">
              Start by sending files or receiving a transfer from another session.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {recentTransfers.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between text-sm">
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      item.direction === 'send'
                        ? 'bg-[#7C3AED]/15 text-[#8B5CF6]'
                        : 'bg-[#10B981]/15 text-[#10B981]'
                    }`}
                  >
                    {item.direction === 'send' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate max-w-md">{item.filename}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {formatBytes(item.fileSize)} • {formatDate(item.timestamp)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] font-medium flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Completed</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
