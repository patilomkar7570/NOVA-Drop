import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  X,
  Copy,
  Check,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Film,
  Music,
  Image as ImageIcon,
  Archive,
  Code,
  Layers,
  StopCircle,
  Send,
  Loader2,
  Folder,
  FolderUp,
  FileUp,
} from 'lucide-react';
import { FileItem } from '../types/index.js';
import { useTransfers } from '../context/TransferContext.js';
import { formatBytes, getFileCategory } from '../utils/formatters.js';
import * as api from '../services/api.js';
import { wsClient } from '../services/websocket.js';

export const SendPage: React.FC = () => {
  const {
    activeSession,
    activeSessionRole,
    setSession,
    files,
    updateFiles,
    clearSession,
    refreshHistory,
    systemStatus,
  } = useTransfers();

  const [isDragging, setIsDragging] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const isSenderSession = activeSession && activeSessionRole === 'sender';

  useEffect(() => {
    // Configure webkitdirectory on folderInputRef to enable directory selection
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const scanned = await scanDroppedItems(e.dataTransfer.items);
      if (scanned.length > 0) {
        updateFiles((prev) => [...prev, ...scanned]);
        return;
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesFromList(Array.from(e.dataTransfer.files));
    }
  };

  const scanDroppedItems = async (items: DataTransferItemList): Promise<FileItem[]> => {
    const collected: FileItem[] = [];

    const traverse = async (entry: any, currentPath = ''): Promise<void> => {
      if (entry.isFile) {
        const file: File = await new Promise((res) => entry.file(res));
        const rel = currentPath ? `${currentPath}/${file.name}` : file.name;
        collected.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          relativePath: rel,
          size: file.size,
          type: file.type || 'application/octet-stream',
          status: 'pending',
          bytesTransferred: 0,
          speedBps: 0,
          etaSeconds: 0,
        });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const readEntries = (): Promise<any[]> => new Promise((res) => reader.readEntries(res));
        let batch: any[];
        do {
          batch = await readEntries();
          for (const item of batch) {
            await traverse(item, currentPath ? `${currentPath}/${entry.name}` : entry.name);
          }
        } while (batch.length > 0);
      }
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry) await traverse(entry);
      }
    }

    return collected;
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesFromList(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesFromList(Array.from(e.target.files));
    }
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const addFilesFromList = (selectedFiles: File[]) => {
    const newItems: FileItem[] = selectedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      relativePath: file.webkitRelativePath || file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      status: 'pending',
      bytesTransferred: 0,
      speedBps: 0,
      etaSeconds: 0,
    }));

    updateFiles((prev) => [...prev, ...newItems]);
  };

  const removeFile = (id: string) => {
    updateFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAllFiles = () => {
    updateFiles(() => []);
  };

  // Start Session and immediately stream files to local engine storage
  const handleStartSession = async () => {
    if (files.length === 0) return;

    try {
      setIsCreatingSession(true);
      setTransferError(null);

      // 1. Create backend session
      const sessionRes = await api.createSession();

      // 2. Register file manifest (including relativePath for folders)
      const manifestList = files.map((f) => ({
        name: f.name,
        relativePath: f.relativePath,
        size: f.size,
        type: f.type,
      }));

      const registered = await api.registerFiles(sessionRes.sessionId, manifestList);

      // Map registered IDs to our local File objects
      const updatedList: FileItem[] = files.map((item, idx) => ({
        ...item,
        id: registered[idx]?.id || item.id,
      }));
      updateFiles(() => updatedList);

      // Connect to WebSocket
      wsClient.connect(sessionRes.sessionId, 'sender', sessionRes.token);
      setSession(sessionRes.session, 'sender', sessionRes.token);
      setIsCreatingSession(false);

      // 3. Immediately stream upload files to local engine so receiver can download instantly
      setIsUploadingFiles(true);
      for (const item of updatedList) {
        if (!item.file) continue;

        updateFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' } : f))
        );

        const uploadResult = await api.uploadFileStream(
          sessionRes.sessionId,
          item.id,
          item.file,
          (loaded) => {
            updateFiles((prev) =>
              prev.map((f) =>
                f.id === item.id ? { ...f, bytesTransferred: loaded } : f
              )
            );
          }
        );

        updateFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: 'uploaded',
                  sha256: uploadResult.sha256,
                  bytesTransferred: item.size,
                }
              : f
          )
        );
      }
      setIsUploadingFiles(false);
    } catch (err) {
      console.error('Failed to create session:', err);
      setTransferError((err as Error).message || 'Failed to initialize transfer session');
      setIsCreatingSession(false);
      setIsUploadingFiles(false);
    }
  };

  useEffect(() => {
    if (!isSenderSession || !activeSession) return;

    const unsubPeerJoined = wsClient.on('peer_joined', (data) => {
      if (data.role === 'receiver') {
        setSession({ ...activeSession, hasReceiver: true, status: 'connected' }, 'sender', null);
      }
    });

    const unsubTransferAccepted = wsClient.on('transfer_accepted', () => {
      setSession({ ...activeSession, status: 'transferring' }, 'sender', null);
    });

    const unsubFileVerified = wsClient.on('file_verified', (data) => {
      updateFiles((prev) =>
        prev.map((f) => {
          if (f.id === data.fileId) {
            return {
              ...f,
              sha256: data.sha256,
              status: data.verified ? 'verified' : 'failed',
            };
          }
          return f;
        })
      );
      refreshHistory();
    });

    const unsubCompleted = wsClient.on('session_completed', () => {
      refreshHistory();
      setTransferSuccess(true);
      setTimeout(() => {
        clearSession();
        setTransferSuccess(false);
      }, 3000);
    });

    const unsubCancelled = wsClient.on('session_cancelled', () => {
      clearSession();
    });

    return () => {
      unsubPeerJoined();
      unsubTransferAccepted();
      unsubFileVerified();
      unsubCompleted();
      unsubCancelled();
    };
  }, [isSenderSession, activeSession, files]);

  const handleCancelSession = async () => {
    if (activeSession) {
      try {
        await api.cancelSession(activeSession.id);
      } catch {}
    }
    clearSession();
    setIsUploadingFiles(false);
  };

  const copyPairingCode = () => {
    if (!activeSession) return;
    navigator.clipboard.writeText(activeSession.pairingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Ensure direct link uses Wi-Fi IP so mobile devices on the local network can open it
  const getDirectLink = () => {
    if (!activeSession) return '';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseUrl = isLocalhost && systemStatus?.localWifiUrl
      ? systemStatus.localWifiUrl
      : window.location.origin;
    return `${baseUrl}/?pair=${activeSession.pairingCode}`;
  };

  const copyDirectLink = () => {
    if (!activeSession) return;
    const url = getDirectLink();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
  const transferredBytes = files.reduce((acc, f) => acc + f.bytesTransferred, 0);
  const totalPercent = totalBytes > 0 ? Math.min(100, Math.round((transferredBytes / totalBytes) * 100)) : 0;

  // Count unique folders in selection
  const folderSet = new Set<string>();
  files.forEach((f) => {
    if (f.relativePath && f.relativePath.includes('/')) {
      const parts = f.relativePath.split('/');
      parts.pop();
      folderSet.add(parts.join('/'));
    }
  });
  const folderCount = folderSet.size;

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
      {/* Hidden File and Folder Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderInputChange}
        multiple
        className="hidden"
      />

      {/* Session Active Header / Pairing Info */}
      {isSenderSession && activeSession && (
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] space-y-6 animate-fadeIn shadow-sm">
          {transferSuccess && (
            <div className="p-4 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Transfer Completed Successfully!</p>
                <p className="text-xs opacity-90">All files and folders have been received by the receiver. Cleaning up temporary session...</p>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8B5CF6]">
                  Active Transfer Session
                </span>
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mt-1">
                {activeSession.status === 'transferring'
                  ? 'Receiver Downloading Files...'
                  : activeSession.hasReceiver
                  ? 'Receiver Connected — Ready for Download'
                  : 'Waiting for Receiver to Connect...'}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Open NOVA Drop on another device (phone, tablet, PC) and enter the code below.
              </p>
            </div>

            <button
              onClick={handleCancelSession}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/20 transition-colors self-start md:self-auto"
            >
              <StopCircle className="w-4 h-4" />
              <span>Cancel Session</span>
            </button>
          </div>

          {/* Pairing Code & Link Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pairing Code Card */}
            <div className="p-4 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <span className="text-xs text-[var(--text-muted)]">Pairing Code:</span>
                <div className="text-2xl font-mono font-extrabold text-[#8B5CF6] tracking-wider mt-0.5">
                  {activeSession.pairingCode}
                </div>
              </div>
              <button
                onClick={copyPairingCode}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#7C3AED]/15 hover:bg-[#7C3AED]/25 text-[#8B5CF6] text-xs font-semibold transition-colors"
              >
                {copiedCode ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Direct Link Card */}
            <div className="p-4 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-xs text-[var(--text-muted)]">Direct Session Link (Wi-Fi):</span>
                <div className="text-xs font-mono text-[var(--text-secondary)] truncate max-w-[240px] mt-1" title={getDirectLink()}>
                  {getDirectLink()}
                </div>
              </div>
              <button
                onClick={copyDirectLink}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[var(--bg-sidebar)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-xs font-semibold transition-colors border border-[var(--border-subtle)] shadow-sm shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Uploading progress to engine */}
          {isUploadingFiles && (
            <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)] flex items-center space-x-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8B5CF6]" />
                  <span>Preparing Items for Transfer...</span>
                </span>
                <span className="text-[#8B5CF6] font-mono">
                  {formatBytes(transferredBytes)} / {formatBytes(totalBytes)} ({totalPercent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--bg-card-subtle)] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7C3AED] to-[#10B981] transition-all duration-200"
                  style={{ width: `${totalPercent}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drag & Drop Upload Zone with Dual Selection Buttons */}
      {!isSenderSession && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 select-none ${
            isDragging
              ? 'border-[#7C3AED] bg-[#7C3AED]/10 scale-[1.01]'
              : 'border-[var(--border-card)] hover:border-[#7C3AED]/60 bg-[var(--bg-card)]/60 hover:bg-[var(--bg-card)]'
          }`}
        >
          <div className="max-w-lg mx-auto space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center mx-auto text-[#8B5CF6]">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                Drag and drop files or folders here
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1.5">
                Support for all formats and entire directory structures. Transferred byte-for-byte with zero compression or quality loss.
              </p>
            </div>

            {/* Dual Selection Buttons: Upload Files / Upload Folders */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-md shadow-[#7C3AED]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <FileUp className="w-4 h-4" />
                <span>Upload Files</span>
              </button>

              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-xs font-semibold border border-[var(--border-subtle)] shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <FolderUp className="w-4 h-4 text-[#8B5CF6]" />
                <span>Upload Folders</span>
              </button>
            </div>

            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Full original folder structure & quality preserved</span>
            </div>
          </div>
        </div>
      )}

      {/* Selected Items List */}
      {files.length > 0 && (
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-[#8B5CF6]" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Selected Items ({files.length} {files.length === 1 ? 'file' : 'files'}
                {folderCount > 0 && ` across ${folderCount} ${folderCount === 1 ? 'folder' : 'folders'}`})
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#7C3AED]/15 text-[#8B5CF6]">
                Total: {formatBytes(totalBytes)}
              </span>
            </div>

            {!isSenderSession && (
              <button
                onClick={clearAllFiles}
                className="text-xs font-semibold text-[#EF4444] hover:text-[#DC2626] transition-colors"
              >
                Remove All
              </button>
            )}
          </div>

          {/* Files List */}
          <div className="divide-y divide-[var(--border-subtle)] max-h-96 overflow-y-auto pr-1">
            {files.map((item) => {
              const category = getFileCategory(item.name, item.type);
              const isInsideFolder = item.relativePath && item.relativePath.includes('/');

              return (
                <div key={item.id} className="py-3.5 flex items-center justify-between text-sm group">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                      {isInsideFolder ? (
                        <Folder className="w-5 h-5 text-[#8B5CF6]" />
                      ) : (
                        renderFileCategoryIcon(category)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--text-primary)] truncate max-w-sm" title={item.name}>
                        {item.name}
                      </p>
                      {isInsideFolder && (
                        <div className="flex items-center space-x-1 text-[11px] text-[#8B5CF6] font-mono truncate max-w-xs" title={item.relativePath}>
                          <span className="truncate">{item.relativePath}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)] mt-0.5">
                        <span title={`${item.size.toLocaleString()} bytes`}>
                          {formatBytes(item.size)}
                        </span>
                        <span>•</span>
                        <span className="uppercase text-[10px] tracking-wider">{category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Status Badge */}
                    {item.status === 'uploading' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#7C3AED]/15 text-[#8B5CF6] flex items-center space-x-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </span>
                    )}

                    {item.status === 'uploaded' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#10B981]/15 text-[#10B981] flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Ready</span>
                      </span>
                    )}

                    {item.status === 'verified' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#10B981]/15 text-[#10B981] flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Transferred</span>
                      </span>
                    )}

                    {!isSenderSession && (
                      <button
                        onClick={() => removeFile(item.id)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#EF4444] hover:bg-[var(--bg-card-subtle)] transition-colors"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Button */}
          {!isSenderSession && (
            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">
                Ready to stream {files.length} item(s) ({formatBytes(totalBytes)})
              </span>
              <button
                onClick={handleStartSession}
                disabled={isCreatingSession}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-sm transition-all shadow-lg shadow-[#7C3AED]/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isCreatingSession ? 'Generating Session...' : 'Create Transfer Session'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {transferError && (
        <div className="p-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{transferError}</span>
        </div>
      )}
    </div>
  );
};
