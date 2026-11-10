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
} from 'lucide-react';
import { useTransfers } from '../context/TransferContext.js';
import { formatBytes, formatPairingCode, getFileCategory } from '../utils/formatters.js';
import * as api from '../services/api.js';
import { wsClient } from '../services/websocket.js';

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

  const [incomingFiles, setIncomingFiles] = useState<
    Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      sha256?: string;
      status: string;
      downloaded: boolean;
      downloadUrl?: string;
    }>
  >([]);

  const [isAccepted, setIsAccepted] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

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

  const handleAcceptTransfer = async () => {
    if (!activeSession) return;
    try {
      await api.acceptTransfer(activeSession.id);
      setIsAccepted(true);
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

  // Download a single file and then cancel/clean up immediately as requested
  const handleDownloadFile = async (fileId: string) => {
    if (!activeSession) return;
    const file = incomingFiles.find((f) => f.id === fileId);
    if (!file) return;

    try {
      const url = api.getDownloadUrl(activeSession.id, fileId);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await api.verifyTransfer(activeSession.id, fileId, file.sha256);
      await refreshHistory();

      // Check if all files in manifest are received
      const remaining = incomingFiles.filter(f => f.id !== fileId && !f.downloaded);
      if (remaining.length === 0) {
        // Once receiver gets the file, cancel and reset everything
        setTimeout(async () => {
          try {
            await api.cancelSession(activeSession.id);
          } catch {}
          clearSession();
          setIncomingFiles([]);
          setIsAccepted(false);
        }, 1500);
      } else {
        setIncomingFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, downloaded: true, status: 'verified' } : f))
        );
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleDownloadAll = async () => {
    if (!activeSession) return;
    setIsDownloadingAll(true);
    for (const f of incomingFiles) {
      const url = api.getDownloadUrl(activeSession.id, f.id);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', f.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await api.verifyTransfer(activeSession.id, f.id, f.sha256);
      await new Promise((r) => setTimeout(r, 600));
    }

    await refreshHistory();
    setIsDownloadingAll(false);

    // Cancel and reset everything after receiving all files
    setTimeout(async () => {
      try {
        await api.cancelSession(activeSession.id);
      } catch {}
      clearSession();
      setIncomingFiles([]);
      setIsAccepted(false);
    }, 1500);
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Code Entry Card when not joined */}
      {!isReceiverSession && (
        <div className="p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center mx-auto text-[#8B5CF6]">
            <KeyRound className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Enter Pairing Code</h2>
            <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
              Enter the 6-digit session code generated on the sending browser to establish a direct, zero-cloud connection.
            </p>
          </div>

          <div className="max-w-xs mx-auto space-y-4">
            <input
              type="text"
              maxLength={7}
              placeholder="e.g. 583-291"
              value={pairingCodeInput}
              onChange={handlePairingCodeChange}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="w-full text-center text-3xl font-mono font-bold tracking-widest px-4 py-3 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all placeholder:text-[var(--text-muted)]"
            />

            <button
              onClick={() => handleJoin()}
              disabled={isJoining || pairingCodeInput.replace(/[^0-9]/g, '').length < 6}
              className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-sm transition-all shadow-lg shadow-[#7C3AED]/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Connect to Sender</span>
                </>
              )}
            </button>
          </div>

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
                Local direct transfer session active. Review and receive incoming files.
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
                  Incoming Files ({incomingFiles.length})
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#7C3AED]/15 text-[#8B5CF6]">
                  Total: {formatBytes(totalIncomingBytes)}
                </span>
              </div>

              {isAccepted && incomingFiles.length > 1 && (
                <button
                  onClick={handleDownloadAll}
                  disabled={isDownloadingAll}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloadingAll ? 'Downloading...' : 'Receive All Files'}</span>
                </button>
              )}
            </div>

            {incomingFiles.length === 0 ? (
              <div className="py-12 text-center text-[var(--text-muted)] text-sm">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8B5CF6] mb-3" />
                <p>Waiting for sender to select files...</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {incomingFiles.map((file) => {
                  const category = getFileCategory(file.name, file.type);
                  return (
                    <div key={file.id} className="py-3.5 flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                          {renderFileCategoryIcon(category)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text-primary)] truncate max-w-sm" title={file.name}>
                            {file.name}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)] mt-0.5">
                            <span>{formatBytes(file.size)}</span>
                            <span>•</span>
                            <span className="uppercase text-[10px] tracking-wider">{category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {file.status === 'verified' || file.downloaded ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#10B981]/15 text-[#10B981] flex items-center space-x-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Received</span>
                          </span>
                        ) : isAccepted ? (
                          <button
                            onClick={() => handleDownloadFile(file.id)}
                            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold transition-colors shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">Awaiting acceptance</span>
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
                  <span>Accept & Receive Files</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
