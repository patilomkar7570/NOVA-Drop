import React from 'react';
import {
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  XCircle,
  FileText,
  Film,
  Music,
  Image as ImageIcon,
  Archive,
  Code,
  Zap,
} from 'lucide-react';
import { useTransfers } from '../context/TransferContext.js';
import { formatBytes, formatSpeed, getFileCategory } from '../utils/formatters.js';

export const ActiveTransfersPage: React.FC = () => {
  const { files, activeSessionRole, clearSession } = useTransfers();

  const activeList = files.filter(
    (f) => f.status === 'uploading' || f.status === 'downloading' || f.status === 'uploaded'
  );

  const renderFileCategoryIcon = (category: string) => {
    switch (category) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-[#8B5CF6]" />;
      case 'video':
        return <Film className="w-5 h-5 text-[#EC4899]" />;
      case 'audio':
        return <Music className="w-5 h-5 text-[#3B82F6]" />;
      case 'archive':
        return <Archive className="w-5 h-5 text-[#F59E0B]" />;
      case 'code':
        return <Code className="w-5 h-5 text-[#10B981]" />;
      default:
        return <FileText className="w-5 h-5 text-[var(--text-muted)]" />;
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-[#8B5CF6]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Active Transfers ({activeList.length})</h2>
          </div>
          {activeList.length > 0 && (
            <button
              onClick={clearSession}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/20 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel All Transfers</span>
            </button>
          )}
        </div>

        {activeList.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-muted)] text-sm space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
              <Activity className="w-6 h-6" />
            </div>
            <p className="font-semibold text-[var(--text-primary)]">No active transfers running</p>
            <p className="text-xs text-[var(--text-muted)]">
              When transfers are streaming between sessions, live backpressure and speed metrics will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeList.map((file) => {
              const category = getFileCategory(file.name, file.type);
              const percent =
                file.size > 0
                  ? Math.min(100, Math.round((file.bytesTransferred / file.size) * 100))
                  : 0;
              const direction = activeSessionRole === 'receiver' ? 'download' : 'upload';

              return (
                <div
                  key={file.id}
                  className="p-5 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                        {renderFileCategoryIcon(category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider flex items-center space-x-1 ${
                              direction === 'upload'
                                ? 'bg-[#7C3AED]/15 text-[#8B5CF6]'
                                : 'bg-[#10B981]/15 text-[#10B981]'
                            }`}
                          >
                            {direction === 'upload' ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownLeft className="w-3 h-3" />
                            )}
                            <span>{direction}</span>
                          </span>
                          <span className="font-semibold text-[var(--text-primary)] truncate max-w-sm" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)] mt-1">
                          <span>
                            {formatBytes(file.bytesTransferred)} of {formatBytes(file.size)}
                          </span>
                          <span>•</span>
                          <span>{percent}%</span>
                          {file.speedBps > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-[#8B5CF6] flex items-center space-x-1">
                                <Zap className="w-3 h-3" />
                                <span>{formatSpeed(file.speedBps)}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-mono font-bold text-[var(--text-primary)]">{percent}%</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-[var(--bg-card)] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        percent === 100
                          ? 'bg-[#10B981]'
                          : 'bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6]'
                      }`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
