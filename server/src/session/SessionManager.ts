import crypto from 'crypto';
import {
  FileManifest,
  PeerInfo,
  SessionDTO,
  SessionStatus,
  TransferSession,
} from '../types/index.js';
import { generatePairingCode, generateSecureToken } from '../crypto/hash.js';
import { StorageManager } from '../storage/StorageManager.js';
import { RateLimiter } from './RateLimiter.js';

export class SessionManager {
  private sessions = new Map<string, TransferSession>();
  private codeToSessionId = new Map<string, string>();
  private storageManager: StorageManager;
  private rateLimiter: RateLimiter;
  private defaultTimeoutMinutes: number;

  constructor(
    storageManager: StorageManager,
    rateLimiter: RateLimiter,
    defaultTimeoutMinutes = 15
  ) {
    this.storageManager = storageManager;
    this.rateLimiter = rateLimiter;
    this.defaultTimeoutMinutes = defaultTimeoutMinutes;

    // Periodic sweep every 60 seconds
    setInterval(() => this.cleanupExpired(), 60 * 1000).unref();
  }

  public createSession(options?: {
    timeoutMinutes?: number;
    userAgent?: string;
    ip?: string;
  }): { session: TransferSession; senderToken: string } {
    const id = crypto.randomUUID();
    let pairingCode: string;

    // Ensure unique pairing code
    let attempts = 0;
    do {
      pairingCode = generatePairingCode();
      attempts++;
      if (attempts > 50) {
        throw new Error('Failed to generate unique pairing code');
      }
    } while (this.codeToSessionId.has(pairingCode));

    const senderToken = generateSecureToken();
    const now = Date.now();
    const timeoutMs = (options?.timeoutMinutes || this.defaultTimeoutMinutes) * 60 * 1000;

    const sender: PeerInfo = {
      id: crypto.randomUUID(),
      role: 'sender',
      connected: true,
      joinedAt: now,
      userAgent: options?.userAgent,
      ip: options?.ip,
    };

    const session: TransferSession = {
      id,
      pairingCode,
      token: senderToken,
      createdAt: now,
      expiresAt: now + timeoutMs,
      status: 'waiting_for_receiver',
      sender,
      receiver: null,
      files: new Map<string, FileManifest>(),
      autoCleanup: true,
    };

    this.sessions.set(id, session);
    this.codeToSessionId.set(pairingCode, id);

    return { session, senderToken };
  }

  public joinSession(
    pairingCode: string,
    options?: { userAgent?: string; ip?: string }
  ): {
    success: boolean;
    session?: TransferSession;
    receiverToken?: string;
    error?: string;
    retryAfterSeconds?: number;
  } {
    const clientIp = options?.ip || '127.0.0.1';
    const rateCheck = this.rateLimiter.isBlocked(clientIp);

    if (rateCheck.blocked) {
      return {
        success: false,
        error: `Too many failed pairing attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      };
    }

    // Normalize code (allow formats with or without hyphen e.g. "123456" or "123-456")
    const cleanCode = pairingCode.replace(/\s+/g, '');
    let formattedCode = cleanCode;
    if (cleanCode.length === 6 && !cleanCode.includes('-')) {
      formattedCode = `${cleanCode.slice(0, 3)}-${cleanCode.slice(3)}`;
    }

    const sessionId = this.codeToSessionId.get(formattedCode);
    if (!sessionId) {
      this.rateLimiter.recordAttempt(clientIp, false);
      return {
        success: false,
        error: 'Invalid or expired pairing code. Please check the code and try again.',
      };
    }

    const session = this.sessions.get(sessionId);
    if (!session || Date.now() > session.expiresAt) {
      this.rateLimiter.recordAttempt(clientIp, false);
      this.codeToSessionId.delete(formattedCode);
      return {
        success: false,
        error: 'This transfer session has expired.',
      };
    }

    if (session.status === 'cancelled' || session.status === 'completed') {
      return {
        success: false,
        error: `Transfer session is already ${session.status}.`,
      };
    }

    // Rate limiter reset on success
    this.rateLimiter.recordAttempt(clientIp, true);

    // Receiver joining
    const receiverToken = generateSecureToken();
    session.receiver = {
      id: crypto.randomUUID(),
      role: 'receiver',
      connected: true,
      joinedAt: Date.now(),
      userAgent: options?.userAgent,
      ip: clientIp,
    };

    // Store receiver token mapping or associate with session
    session.status = 'connected';

    return {
      success: true,
      session,
      receiverToken,
    };
  }

  public getSession(sessionId: string): TransferSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session && Date.now() > session.expiresAt) {
      this.expireSession(sessionId);
      return undefined;
    }
    return session;
  }

  public getSessionByCode(pairingCode: string): TransferSession | undefined {
    const cleanCode = pairingCode.replace(/\s+/g, '');
    let formattedCode = cleanCode;
    if (cleanCode.length === 6 && !cleanCode.includes('-')) {
      formattedCode = `${cleanCode.slice(0, 3)}-${cleanCode.slice(3)}`;
    }
    const sessionId = this.codeToSessionId.get(formattedCode);
    return sessionId ? this.getSession(sessionId) : undefined;
  }

  public addFiles(
    sessionId: string,
    fileList: Array<{
      name: string;
      relativePath?: string;
      size: number;
      type: string;
      sha256?: string;
    }>
  ): FileManifest[] {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    const added: FileManifest[] = [];
    for (const f of fileList) {
      const fileId = crypto.randomUUID();
      const manifest: FileManifest = {
        id: fileId,
        name: f.name,
        relativePath: f.relativePath,
        size: f.size,
        type: f.type || 'application/octet-stream',
        sha256: f.sha256,
        status: 'pending',
        bytesUploaded: 0,
        bytesDownloaded: 0,
      };
      session.files.set(fileId, manifest);
      added.push(manifest);
    }

    return added;
  }

  public getFile(sessionId: string, fileId: string): FileManifest | undefined {
    const session = this.getSession(sessionId);
    return session?.files.get(fileId);
  }

  public updateFile(
    sessionId: string,
    fileId: string,
    updates: Partial<FileManifest>
  ): FileManifest | undefined {
    const session = this.getSession(sessionId);
    const file = session?.files.get(fileId);
    if (file) {
      Object.assign(file, updates);
      return file;
    }
    return undefined;
  }

  public setSessionStatus(sessionId: string, status: SessionStatus): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.status = status;
    }
  }

  public async cancelSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'cancelled';
    this.codeToSessionId.delete(session.pairingCode);

    // Clean up temporary files immediately
    await this.storageManager.deleteSession(sessionId);
    return true;
  }

  public async expireSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'expired';
      this.codeToSessionId.delete(session.pairingCode);
      await this.storageManager.deleteSession(sessionId);
    }
  }

  public async cleanupExpired(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (now > session.expiresAt || session.status === 'cancelled' || session.status === 'completed') {
        // If completed or cancelled more than 5 minutes ago, or expired
        if (now > session.expiresAt || session.status === 'cancelled') {
          this.codeToSessionId.delete(session.pairingCode);
          await this.storageManager.deleteSession(id);
          this.sessions.delete(id);
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  public toDTO(session: TransferSession): SessionDTO {
    return {
      id: session.id,
      pairingCode: session.pairingCode,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      status: session.status,
      hasSender: session.sender.connected,
      hasReceiver: session.receiver !== null && session.receiver.connected,
      files: Array.from(session.files.values()),
    };
  }

  public getActiveTransfersCount(): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.status === 'transferring' || session.status === 'connected') {
        for (const file of session.files.values()) {
          if (file.status === 'uploading' || file.status === 'downloading') {
            count++;
          }
        }
      }
    }
    return count;
  }

  public getActiveSessionsCount(): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.status === 'waiting_for_receiver' || session.status === 'connected' || session.status === 'transferring') {
        count++;
      }
    }
    return count;
  }
}
