export type SessionStatus =
  | 'waiting_for_receiver'
  | 'connected'
  | 'transferring'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type FileTransferStatus =
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'downloading'
  | 'verified'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface FileManifest {
  id: string;
  name: string;
  relativePath?: string;
  size: number;
  type: string;
  sha256?: string; // Precomputed by sender or verified by backend
  status: FileTransferStatus;
  bytesUploaded: number;
  bytesDownloaded: number;
  tempPath?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface PeerInfo {
  id: string;
  role: 'sender' | 'receiver';
  connected: boolean;
  joinedAt: number;
  userAgent?: string;
  ip?: string;
}

export interface TransferSession {
  id: string;
  pairingCode: string;
  token: string;
  createdAt: number;
  expiresAt: number;
  status: SessionStatus;
  sender: PeerInfo;
  receiver: PeerInfo | null;
  files: Map<string, FileManifest>;
  autoCleanup: boolean;
}

export interface SessionDTO {
  id: string;
  pairingCode: string;
  createdAt: number;
  expiresAt: number;
  status: SessionStatus;
  hasSender: boolean;
  hasReceiver: boolean;
  files: FileManifest[];
}

export interface HistoryRecord {
  id: string;
  sessionId: string;
  fileId: string;
  filename: string;
  fileSize: number;
  direction: 'send' | 'receive';
  sha256: string;
  status: 'completed' | 'failed' | 'cancelled';
  timestamp: string;
  durationMs: number;
  avgSpeedBps: number;
}

export interface ServerSettings {
  port: number;
  host: string;
  tempDirectory: string;
  autoCleanupOnFinish: boolean;
  sessionTimeoutMinutes: number;
  historyEnabled: boolean;
  historyRetentionDays: number;
}

export interface SystemStatus {
  version: string;
  productName: string;
  uptimeSeconds: number;
  host: string;
  port: number;
  localhostOnly: boolean;
  tempStorageUsageBytes: number;
  tempFilesCount: number;
  activeSessionsCount: number;
  activeTransfersCount: number;
  freeDiskBytes?: number;
  totalDiskBytes?: number;
}
