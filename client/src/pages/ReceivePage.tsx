import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertCircle,
  FileText,
  Film,
  Music,
  Image as ImageIcon,
  Archive,
  Code,
  Layers,
  ArrowDownLeft,
  KeyRound,
  Download,
  Loader2,
  Folder,
} from 'lucide-react';
import { useTransfers } from '../context/TransferContext.js';
import { formatBytes, formatPairingCode, getFileCategory } from '../utils/formatters.js';
import * as api from '../services/api.js';
import { wsClient } from '../services/websocket.js';

interface IncomingItem {
  id: string;
  name: string;
  relativePath?: string;
  size: number;
  type: string;
  sha256?: string;
  status: string;
  downloaded: boolean;
  progressPercent?: number;
  downloadUrl?: string;
}

export const ReceivePage: React.FC = () => {
  const {
    activeSession,
    activeSessionRole,
    setSession,
    clearSession,
    refreshHistory,
  } = useTransfers();

  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [incomingFiles, setIncomingFiles] = useState<IncomingItem[]>([]);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);

  const isReceiverSession = activeSession && activeSessionRole === 'receiver';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pairCode = params.get('pair');
    if (pairCode && !activeSession) {
      setPairingCodeInput(pairCode);
      handleJoin(pairCode);
    }
  }, []);

  const handlePairingCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPairingCode(e.target.value);
    setPairingCodeInput(formatted);
  };

  const handleJoin = async (codeToJoin?: string) => {
    const targetCode = codeToJoin || pairingCodeInput;
    if (!targetCode || targetCode.replace(/[^0-9]/g, '').length < 6) {
      setJoinError('Please enter a valid 6-digit pairing code (e.g. 482-915)');
      return;
    }

    try {
      setIsJoining(true);
      setJoinError(null);

      const res = await api.joinSession(targetCode);

      wsClient.connect(res.sessionId, 'receiver', res.token);
      setSession(res.session, 'receiver', res.token);

      if (res.session.files && res.session.files.length > 0) {
        setIncomingFiles(
          res.session.files.map((f) => ({
            id: f.id,
            name: f.name,
            relativePath: f.relativePath,
            size: f.size,
            type: f.type,
            sha256: f.sha256,
            status: f.status,
            downloaded: false,
            downloadUrl: api.getDownloadUrl(res.sessionId, f.id),
          }))
        );
      }
    } catch (err: any) {
      console.error('Failed to join:', err);
      setJoinError(err.message || 'Failed to join session');
    } finally {
      setIsJoining(false);
    }
  };

  useEffect(() => {
    if (!isReceiverSession || !activeSession) return;

    const unsubFilesOffered = wsClient.on('files_offered', (data) => {
      setIncomingFiles(
        data.files.map((f: any) => ({
          id: f.id,
          name: f.name,
          relativePath: f.relativePath,
          size: f.size,
          type: f.type,
          sha256: f.sha256,
          status: 'pending',
          downloaded: false,
          downloadUrl: api.getDownloadUrl(activeSession.id, f.id),
        }))
      );
    });

    const unsubFileReady = wsClient.on('file_ready', (data) => {
      setIncomingFiles((prev) =>
        prev.map((f) => {
          if (f.id === data.fileId) {
            return {
              ...f,
              status: 'ready_for_download',
              sha256: data.sha256,
              downloadUrl: api.getDownloadUrl(activeSession.id, f.id),
            };
          }
          return f;
        })
      );
    });

    const unsubFileVerified = wsClient.on('file_verified', (data) => {
      setIncomingFiles((prev) =>
        prev.map((f) => {
          if (f.id === data.fileId) {
            return {
              ...f,
              status: data.verified ? 'verified' : 'failed',
              sha256: data.sha256,
              downloaded: true,
              progressPercent: 100,
            };
          }
          return f;
        })
      );
      refreshHistory();
    });

    const unsubCancelled = wsClient.on('session_cancelled', () => {
      clearSession();
      setIncomingFiles([]);
      setIsAccepted(false);
    });

    return () => {
      unsubFilesOffered();
      unsubFileReady();
      unsubFileVerified();
      unsubCancelled();
    };
  }, [isReceiverSession, activeSession]);

  // When Accept is clicked, automatically download all incoming files sequentially
  const handleAcceptTransfer = async () => {
    if (!activeSession) return;
    try {
      setIsAccepted(true);
      await api.acceptTransfer(activeSession.id);
      await startDownloadAll();
    } catch (err) {
      console.error('Failed to accept:', err);
    }
  };

  const handleRejectTransfer = async () => {
    if (!activeSession) return;
    try {
      await api.rejectTransfer(activeSession.id);
      clearSession();
      setIncomingFiles([]);
      setIsAccepted(false);
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  const startDownloadAll = async () => {
    if (!activeSession) return;
    setIsDownloadingAll(true);

    for (const f of incomingFiles) {
      if (f.downloaded || f.status === 'verified') continue;

      try {
        setIncomingFiles((prev) =>
          prev.map((item) =>
            item.id === f.id ? { ...item, status: 'downloading', progressPercent: 0 } : item
          )
        );

        const sha = await api.downloadFileWithProgress(
          activeSession.id,
          f.id,
          f.name,
          f.size,
          (loaded, total) => {
            const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 50;
            setIncomingFiles((prev) =>
              prev.map((item) =>
                item.id === f.id ? { ...item, progressPercent: percent } : item
              )
            );
          }
        );

        await api.verifyTransfer(activeSession.id, f.id, sha || f.sha256);

        setIncomingFiles((prev) =>
          prev.map((item) =>
            item.id === f.id
              ? { ...item, downloaded: true, status: 'verified', progressPercent: 100 }
              : item
          )
        );
      } catch (err) {
        console.error(`Download failed for ${f.name}:`, err);
        setIncomingFiles((prev) =>
          prev.map((item) => (item.id === f.id ? { ...item, status: 'failed' } : item))
        );
      }
    }

    await refreshHistory();
    setIsDownloadingAll(false);
    setTransferSuccess(true);

    // Clean up and cancel session after files are safely received
    setTimeout(async () => {
      try {
        await api.cancelSession(activeSession.id);
      } catch {}
      clearSession();
      setIncomingFiles([]);
      setIsAccepted(false);
      setTransferSuccess(false);
    }, 3000);
  };

  // Download a single file individually
  const handleDownloadFile = async (fileId: string) => {
    if (!activeSession) return;
    const f = incomingFiles.find((item) => item.id === fileId);
    if (!f) return;

    try {
      setIncomingFiles((prev) =>
        prev.map((item) =>
          item.id === fileId ? { ...item, status: 'downloading', progressPercent: 0 } : item
        )
      );

      const sha = await api.downloadFileWithProgress(
        activeSession.id,
        f.id,
        f.name,
        f.size,
        (loaded, total) => {
          const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 50;
          setIncomingFiles((prev) =>
            prev.map((item) =>
              item.id === fileId ? { ...item, progressPercent: percent } : item
            )
          );
        }
      );

      await api.verifyTransfer(activeSession.id, f.id, sha || f.sha256);
      await refreshHistory();

      setIncomingFiles((prev) => {
        const next = prev.map((item) =>
          item.id === fileId
            ? { ...item, downloaded: true, status: 'verified', progressPercent: 100 }
            : item
        );
        const allDone = next.every((item) => item.downloaded || item.status === 'verified');
        if (allDone) {
          setTransferSuccess(true);
          setTimeout(async () => {
            try {
              await api.cancelSession(activeSession.id);
            } catch {}
            clearSession();
            setIncomingFiles([]);
            setIsAccepted(false);
            setTransferSuccess(false);
          }, 3000);
        }
        return next;
      });
    } catch (err) {
      console.error(`Download failed for ${f.name}:`, err);
      setIncomingFiles((prev) =>
        prev.map((item) => (item.id === fileId ? { ...item, status: 'failed' } : item))
      );
    }
  };

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

  const totalIncomingBytes = incomingFiles.reduce((acc, f) => acc + f.size, 0);

  // Count unique folders in incoming files
  const folderSet = new Set<string>();
  incomingFiles.forEach((f) => {
    if (f.relativePath && f.relativePath.includes('/')) {
      const parts = f.relativePath.split('/');
      parts.pop();
      folderSet.add(parts.join('/'));
    }
  });
  const folderCount = folderSet.size;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Receive Files & Folders
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Connect to a sender by pairing code or direct link to receive original files and folder structures with cryptographic verification.
        </p>
      </div>

      {/* Code Entry Card (if not connected) */}
      {!isReceiverSession && (
        <div className="p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center mx-auto text-[#10B981]">
            <ArrowDownLeft className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Enter 6-Digit Pairing Code
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Ask the sender for their pairing code displayed on their screen, or open their direct session link.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin();
            }}
            className="max-w-sm mx-auto space-y-4"
          >
            <div className="relative">
              <input
                type="text"
                value={pairingCodeInput}
                onChange={handlePairingCodeChange}
                placeholder="482-915"
                maxLength={7}
                autoFocus
                className="w-full text-center text-3xl font-mono font-extrabold tracking-widest px-4 py-4 rounded-xl bg-[var(--bg-card-subtle)] border-2 border-[var(--border-subtle)] focus:border-[#7C3AED] focus:outline-none text-[var(--text-primary)] transition-all placeholder:text-[var(--text-muted)] placeholder:font-normal placeholder:tracking-normal placeholder:text-lg"
              />
            </div>

            <button
              type="submit"
              disabled={isJoining || pairingCodeInput.replace(/[^0-9]/g, '').length < 6}
              className="w-full py-3.5 px-6 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-sm transition-all shadow-lg shadow-[#7C3AED]/25 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting Securely...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Connect & Receive</span>
                </>
              )}
            </button>
          </form>

          {joinError && (
            <div className="max-w-md mx-auto p-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center space-x-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{joinError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-[var(--border-subtle)] max-w-sm mx-auto flex items-center justify-center space-x-2 text-xs text-[var(--text-muted)]">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span>Guarded with brute-force rate limiting</span>
          </div>
        </div>
      )}

      {/* Receiver Connected View */}
      {isReceiverSession && activeSession && (
        <div className="space-y-6 animate-fadeIn">
          {/* Transfer Success Banner */}
          {transferSuccess && (
            <div className="p-4 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] flex items-center space-x-3 shadow-sm animate-fadeIn">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <p className="font-bold text-sm">Transfer Complete!</p>
                <p className="text-xs opacity-90">All files and folders have been received safely and verified. Cleaning up session...</p>
              </div>
            </div>
          )}

          {/* Session Banner */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#10B981]">
                  Connected Session
                </span>
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mt-1">
                Connected to Sender (Code: {activeSession.pairingCode})
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Local direct transfer session active. Click Accept to receive original files directly to this device.
              </p>
            </div>

            <button
              onClick={() => {
                clearSession();
                setIncomingFiles([]);
                setIsAccepted(false);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] transition-colors self-start md:self-auto"
            >
              Disconnect
            </button>
          </div>

          {/* Incoming Files Manifest */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-[#8B5CF6]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Incoming Items ({incomingFiles.length} {incomingFiles.length === 1 ? 'file' : 'files'}
                  {folderCount > 0 && ` across ${folderCount} ${folderCount === 1 ? 'folder' : 'folders'}`})
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#7C3AED]/15 text-[#8B5CF6]">
                  Total: {formatBytes(totalIncomingBytes)}
                </span>
              </div>

              {isAccepted && incomingFiles.length > 1 && (
                <button
                  onClick={startDownloadAll}
                  disabled={isDownloadingAll}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloadingAll ? 'Downloading...' : 'Receive All Items'}</span>
                </button>
              )}
            </div>

            {incomingFiles.length === 0 ? (
              <div className="py-12 text-center text-[var(--text-muted)] text-sm">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8B5CF6] mb-3" />
                <p>Waiting for sender to select items...</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {incomingFiles.map((file) => {
                  const category = getFileCategory(file.name, file.type);
                  const isInsideFolder = file.relativePath && file.relativePath.includes('/');

                  return (
                    <div key={file.id} className="py-3.5 flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                          {isInsideFolder ? (
                            <Folder className="w-5 h-5 text-[#8B5CF6]" />
                          ) : (
                            renderFileCategoryIcon(category)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text-primary)] truncate max-w-sm" title={file.name}>
                            {file.name}
                          </p>
                          {isInsideFolder && (
                            <div className="flex items-center space-x-1 text-[11px] text-[#8B5CF6] font-mono truncate max-w-xs" title={file.relativePath}>
                              <span className="truncate">{file.relativePath}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)] mt-0.5">
                            <span>{formatBytes(file.size)}</span>
                            <span>•</span>
                            <span className="uppercase text-[10px] tracking-wider">{category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {file.status === 'downloading' && (
                          <div className="flex items-center space-x-2">
                            <div className="w-24 h-2 rounded-full bg-[var(--bg-card-subtle)] overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-gradient-to-r from-[#7C3AED] to-[#10B981] transition-all duration-150"
                                style={{ width: `${file.progressPercent || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-mono font-semibold text-[#8B5CF6] flex items-center space-x-1">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>{file.progressPercent || 0}%</span>
                            </span>
                          </div>
                        )}

                        {(file.status === 'verified' || file.downloaded) && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#10B981]/15 text-[#10B981] flex items-center space-x-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Received</span>
                          </span>
                        )}

                        {file.status !== 'downloading' && !file.downloaded && file.status !== 'verified' && (
                          isAccepted ? (
                            <button
                              onClick={() => handleDownloadFile(file.id)}
                              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold transition-colors shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">Awaiting acceptance</span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Accept / Reject controls */}
            {!isAccepted && incomingFiles.length > 0 && (
              <div className="pt-6 border-t border-[var(--border-subtle)] flex items-center justify-end space-x-3">
                <button
                  onClick={handleRejectTransfer}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/20 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Decline Transfer</span>
                </button>

                <button
                  onClick={handleAcceptTransfer}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] shadow-lg shadow-[#10B981]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept & Receive Items</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
