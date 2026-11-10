import React, { useState } from 'react';
import {
  History as HistoryIcon,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  XCircle,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useTransfers } from '../context/TransferContext.js';
import { formatBytes, formatDate } from '../utils/formatters.js';
import * as api from '../services/api.js';

export const HistoryPage: React.FC = () => {
  const { history, refreshHistory } = useTransfers();
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDirection, setFilterDirection] = useState<'all' | 'send' | 'receive'>('all');
  const [isClearing, setIsClearing] = useState(false);

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all transfer history?')) return;
    try {
      setIsClearing(true);
      await api.clearHistory();
      await refreshHistory();
    } catch (err) {
      console.error('Failed to clear history:', err);
    } finally {
      setIsClearing(false);
    }
  };

  const copyHash = (id: string, hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHashId(id);
    setTimeout(() => setCopiedHashId(null), 2000);
  };

  const filtered = history.filter((item) => {
    const matchesSearch = item.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDirection = filterDirection === 'all' || item.direction === filterDirection;
    return matchesSearch && matchesDirection;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] space-y-6 shadow-sm">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <HistoryIcon className="w-5 h-5 text-[#8B5CF6]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Transfer History ({history.length})</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            {/* Direction Filter */}
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C3AED]"
            >
              <option value="all">All Directions</option>
              <option value="send">Sent Only</option>
              <option value="receive">Received Only</option>
            </select>

            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                disabled={isClearing}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/20 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>
        </div>

        {/* History Table */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-muted)] text-sm space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
              <HistoryIcon className="w-6 h-6" />
            </div>
            <p className="font-semibold text-[var(--text-primary)]">No history records found</p>
            <p className="text-xs text-[var(--text-muted)]">
              Completed file transfers will be logged here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="pb-3 pl-2">Direction</th>
                  <th className="pb-3">Filename</th>
                  <th className="pb-3">Size</th>
                  <th className="pb-3">Date & Time</th>
                  <th className="pb-3">Checksum</th>
                  <th className="pb-3 pr-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filtered.map((item) => {
                  const isCopied = copiedHashId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-[var(--bg-card-subtle)]/50 transition-colors">
                      <td className="py-3.5 pl-2">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.direction === 'send'
                              ? 'bg-[#7C3AED]/15 text-[#8B5CF6]'
                              : 'bg-[#10B981]/15 text-[#10B981]'
                          }`}
                        >
                          {item.direction === 'send' ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          )}
                          <span className="capitalize">{item.direction}</span>
                        </span>
                      </td>

                      <td className="py-3.5 font-medium text-[var(--text-primary)] max-w-xs truncate" title={item.filename}>
                        {item.filename}
                      </td>

                      <td className="py-3.5 text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {formatBytes(item.fileSize)}
                      </td>

                      <td className="py-3.5 text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {formatDate(item.timestamp)}
                      </td>

                      <td className="py-3.5">
                        <div className="flex items-center space-x-1.5">
                          <code className="text-[11px] font-mono text-[var(--text-secondary)] bg-[var(--bg-card-subtle)] px-2 py-0.5 rounded border border-[var(--border-subtle)] truncate max-w-[160px]" title={item.sha256}>
                            {item.sha256}
                          </code>
                          <button
                            onClick={() => copyHash(item.id, item.sha256)}
                            title="Copy full checksum"
                            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-subtle)] transition-colors"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-[#10B981]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 pr-2 text-right">
                        {item.status === 'completed' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#10B981]/15 text-[#10B981]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Completed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EF4444]/15 text-[#EF4444]">
                            <XCircle className="w-3.5 h-3.5" />
                            <span className="capitalize">{item.status}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span>Strict Privacy: No file contents are ever stored in history.</span>
          </div>
          <span>Showing {filtered.length} transfer(s)</span>
        </div>
      </div>
    </div>
  );
};
