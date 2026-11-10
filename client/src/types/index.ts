export type NavPage = 'overview' | 'send' | 'receive' | 'transfers' | 'history' | 'settings';

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

export interface FileItem {
  id: string;
  file?: File;
  name: string;
  size: number;
  type: string;
  sha256?: string;
  status: FileTransferStatus;
  bytesTransferred: number;
  speedBps: number;
  etaSeconds: number;
  error?: string;
}

export interface SessionData {
  id: string;
  pairingCode: string;
  createdAt: number;
  expiresAt: number;
  status: SessionStatus;
  hasSender: boolean;
  hasReceiver: boolean;
  files: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    sha256?: string;
    status: FileTransferStatus;
  }>;
}

export interface HistoryItem {
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

export interface SystemStatusData {
  product: string;
  tagline: string;
  version: string;
  status: string;
  host: string;
  port: number;
  localIp?: string;
  localWifiUrl?: string;
  localhostOnly: boolean;
  uptimeSeconds: number;
  platform: string;
  tempStorageBytes: number;
  tempStorageFileCount: number;
  activeSessions: number;
  activeTransfers: number;
  privacy: {
    cloudStorage: boolean;
    telemetry: boolean;
    analytics: boolean;
    compression: boolean;
    byteForBytePreserved: boolean;
    sha256Verified: boolean;
    localFirst: boolean;
  };
}

export interface SettingsData {
  version: string;
  host: string;
  port: number;
  tempDirectory: string;
  autoCleanupOnFinish: boolean;
  sessionTimeoutMinutes: number;
  historyEnabled: boolean;
  historyRetentionDays: number;
  tempStorageBytes: number;
  tempStorageFileCount: number;
}
