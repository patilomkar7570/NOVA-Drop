import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  HardDrive,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';
import { useTransfers } from '../context/TransferContext.js';
import { SettingsData } from '../types/index.js';
import { formatBytes } from '../utils/formatters.js';
import * as api from '../services/api.js';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { systemStatus, refreshSystemStatus, refreshHistory } = useTransfers();

  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [clearingTemp, setClearingTemp] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleToggleAutoCleanup = async (checked: boolean) => {
    if (!settings) return;
    try {
      await api.updateSettings({ autoCleanupOnFinish: checked });
      setSettings({ ...settings, autoCleanupOnFinish: checked });
      setStatusMessage('Settings updated.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleHistory = async (checked: boolean) => {
    if (!settings) return;
    try {
      await api.updateSettings({ historyEnabled: checked });
      setSettings({ ...settings, historyEnabled: checked });
      setStatusMessage('History setting updated.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearTemp = async () => {
    try {
      setClearingTemp(true);
      const res = await api.clearTempStorage();
      await refreshSystemStatus();
      await loadSettings();
      setStatusMessage(`Cleared ${res.filesRemoved} temp files (${formatBytes(res.bytesFreed)} freed).`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setClearingTemp(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all transfer history records?')) return;
    try {
      setClearingHistory(true);
      await api.clearHistory();
      await refreshHistory();
      setStatusMessage('Transfer history cleared.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setClearingHistory(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {statusMessage && (
        <div className="p-4 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Appearance Settings */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] space-y-4 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center space-x-2">
            <Sun className="w-5 h-5 text-[#8B5CF6]" />
            <span>Appearance</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Choose your interface visual theme. Auto syncs seamlessly with your system preference.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2">
          <button
            onClick={() => setTheme('system')}
            className={`p-4 rounded-xl border text-left transition-all ${
              theme === 'system'
                ? 'bg-[#7C3AED]/15 border-[#7C3AED] shadow-sm'
                : 'bg-[var(--bg-card-subtle)] border-[var(--border-subtle)] hover:border-[#8B5CF6]/50'
            }`}
          >
            <Monitor className="w-5 h-5 text-[#8B5CF6] mb-2" />
            <div className="font-semibold text-[var(--text-primary)] text-sm">Auto (System)</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Recommended default</div>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left transition-all ${
              theme === 'dark'
                ? 'bg-[#7C3AED]/15 border-[#7C3AED] shadow-sm'
                : 'bg-[var(--bg-card-subtle)] border-[var(--border-subtle)] hover:border-[#8B5CF6]/50'
            }`}
          >
            <Moon className="w-5 h-5 text-[#8B5CF6] mb-2" />
            <div className="font-semibold text-[var(--text-primary)] text-sm">Dark Theme</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Deep charcoal & violet</div>
          </button>

          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left transition-all ${
              theme === 'light'
                ? 'bg-[#7C3AED]/15 border-[#7C3AED] shadow-sm'
                : 'bg-[var(--bg-card-subtle)] border-[var(--border-subtle)] hover:border-[#8B5CF6]/50'
            }`}
          >
            <Sun className="w-5 h-5 text-[#8B5CF6] mb-2" />
            <div className="font-semibold text-[var(--text-primary)] text-sm">Light Theme</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Clean high-contrast</div>
          </button>
        </div>
      </div>

      {/* Temporary Storage Management */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] space-y-6 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-[#8B5CF6]" />
            <span>Temporary Storage & Cleanup</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Transfers stream through local temporary storage during the session and are cleaned up safely.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-[var(--text-muted)]">Dedicated Storage Directory:</span>
              <div className="text-xs font-mono text-[var(--text-primary)] mt-1 break-all">
                {settings?.tempDirectory || 'Loading...'}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-[var(--text-muted)]">Current Temp Usage:</span>
              <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                {formatBytes(settings?.tempStorageBytes || 0)} ({settings?.tempStorageFileCount || 0} files)
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Automatic File Cleanup</div>
              <p className="text-xs text-[var(--text-muted)]">
                Automatically delete temporary files when transfer is verified or session completes.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.autoCleanupOnFinish ?? true}
                onChange={(e) => handleToggleAutoCleanup(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--border-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7C3AED]"></div>
            </label>
          </div>

          <div className="pt-2">
            <button
              onClick={handleClearTemp}
              disabled={clearingTemp}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/20 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{clearingTemp ? 'Purging...' : 'Clear All Temporary Files Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* History Retention */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] space-y-4 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center space-x-2">
            <Clock className="w-5 h-5 text-[#8B5CF6]" />
            <span>Transfer History</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            History only records filenames, sizes and verification checksums. File contents are never retained.
          </p>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">Enable Transfer History</div>
            <p className="text-xs text-[var(--text-muted)]">Keep a local audit log of completed transfers</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings?.historyEnabled ?? true}
              onChange={(e) => handleToggleHistory(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--border-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7C3AED]"></div>
          </label>
        </div>

        <div className="pt-2">
          <button
            onClick={handleClearHistory}
            disabled={clearingHistory}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/20 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{clearingHistory ? 'Clearing...' : 'Clear All History Records'}</span>
          </button>
        </div>
      </div>

      {/* System & Privacy Information */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] space-y-4 shadow-sm">
        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-[#10B981]" />
          <span>System & Privacy Architecture</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] space-y-2">
            <div className="font-semibold text-[var(--text-primary)]">Network Binding</div>
            <div className="text-[var(--text-muted)]">
              Address: <span className="text-[var(--text-primary)] font-mono">{systemStatus?.host || '127.0.0.1'}</span>
            </div>
            <div className="text-[var(--text-muted)]">
              Port: <span className="text-[var(--text-primary)] font-mono">{systemStatus?.port || 3000}</span>
            </div>
            <div className="text-[var(--text-muted)]">
              Status:{' '}
              <span className="text-[#10B981] font-semibold">Strict Localhost (Zero WAN exposure)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] space-y-2">
            <div className="font-semibold text-[var(--text-primary)]">Application Details</div>
            <div className="text-[var(--text-muted)]">
              Product: <span className="text-[var(--text-primary)] font-semibold">NOVA Drop</span>
            </div>
            <div className="text-[var(--text-muted)]">
              Edition: <span className="text-[#8B5CF6] font-semibold">Phase 1: PC Web Edition</span>
            </div>
            <div className="text-[var(--text-muted)]">
              Version: <span className="text-[var(--text-primary)] font-mono">{systemStatus?.version || '1.0.0'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
