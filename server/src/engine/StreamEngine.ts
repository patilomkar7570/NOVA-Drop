import fs from 'fs';
import { pipeline } from 'stream/promises';
import { Request, Response } from 'express';
import { StorageManager } from '../storage/StorageManager.js';
import { SessionManager } from '../session/SessionManager.js';
import { HistoryManager } from '../history/HistoryManager.js';
import { WebSocketHandler } from '../realtime/WebSocketServer.js';
import { Sha256TransformStream, verifyHash } from '../crypto/hash.js';

export class StreamEngine {
  private storageManager: StorageManager;
  private sessionManager: SessionManager;
  private historyManager: HistoryManager;
  private wsHandler: WebSocketHandler;

  constructor(
    storageManager: StorageManager,
    sessionManager: SessionManager,
    historyManager: HistoryManager,
    wsHandler: WebSocketHandler
  ) {
    this.storageManager = storageManager;
    this.sessionManager = sessionManager;
    this.historyManager = historyManager;
    this.wsHandler = wsHandler;
  }

  /**
   * Handle streaming file upload with streaming SHA-256 calculation
   * Supports both raw binary octet-stream and standard stream
   */
  public async handleUploadStream(
    sessionId: string,
    fileId: string,
    req: Request,
    res: Response
  ): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found or expired' });
      return;
    }

    const file = this.sessionManager.getFile(sessionId, fileId);
    if (!file) {
      res.status(404).json({ error: 'File manifest not found in session' });
      return;
    }

    const tempFilePath = this.storageManager.getFilePath(sessionId, fileId);
    const writeStream = fs.createWriteStream(tempFilePath);
    const hasher = new Sha256TransformStream();

    file.status = 'uploading';
    file.startedAt = Date.now();
    let bytesReceived = 0;
    let lastProgressTime = Date.now();
    let lastProgressBytes = 0;

    // Track stream progress and speed calculation
    hasher.on('data', (chunk: Buffer) => {
      bytesReceived += chunk.length;
      file.bytesUploaded = bytesReceived;

      const now = Date.now();
      const elapsedMs = now - lastProgressTime;

      // Broadcast progress every 200ms or on completion to avoid flooding
      if (elapsedMs >= 200 || bytesReceived === file.size) {
        const deltaBytes = bytesReceived - lastProgressBytes;
        const speedBps = elapsedMs > 0 ? (deltaBytes / elapsedMs) * 1000 : 0;
        const remainingBytes = Math.max(0, file.size - bytesReceived);
        const etaSeconds = speedBps > 0 ? Math.ceil(remainingBytes / speedBps) : 0;

        this.wsHandler.notifyProgress(
          sessionId,
          fileId,
          bytesReceived,
          file.size,
          'upload',
          speedBps,
          etaSeconds
        );

        lastProgressTime = now;
        lastProgressBytes = bytesReceived;
      }
    });

    try {
      // Pipeline automatically handles backpressure and cleans up on stream errors
      await pipeline(req, hasher, writeStream);

      const calculatedHash = hasher.getDigest();
      file.sha256 = calculatedHash;
      file.bytesUploaded = bytesReceived;
      file.status = 'uploaded';
      file.completedAt = Date.now();
      file.tempPath = tempFilePath;

      const durationMs = (file.completedAt || Date.now()) - (file.startedAt || Date.now());
      const avgSpeed = durationMs > 0 ? (bytesReceived / durationMs) * 1000 : 0;

      // Notify peers via WebSocket
      this.wsHandler.notifyFileReady(sessionId, fileId, calculatedHash);

      res.status(200).json({
        success: true,
        fileId,
        sha256: calculatedHash,
        bytesReceived,
        durationMs,
        avgSpeedBps: avgSpeed,
      });
    } catch (err) {
      file.status = 'failed';
      file.error = (err as Error).message;
      await this.storageManager.deleteFile(sessionId, fileId);

      this.wsHandler.broadcastToRoom(sessionId, {
        type: 'transfer_error',
        fileId,
        error: (err as Error).message,
      });

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Upload streaming failed',
          details: (err as Error).message,
        });
      }
    }
  }

  /**
   * Handle streaming file download to receiver with byte-for-byte fidelity,
   * proper Content-Disposition header and SHA-256 verification header.
   */
  public async handleDownloadStream(
    sessionId: string,
    fileId: string,
    _req: Request,
    res: Response
  ): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found or expired' });
      return;
    }

    const file = this.sessionManager.getFile(sessionId, fileId);
    if (!file) {
      res.status(404).json({ error: 'File manifest not found' });
      return;
    }

    const tempFilePath = this.storageManager.getFilePath(sessionId, fileId);
    if (!fs.existsSync(tempFilePath)) {
      res.status(404).json({ error: 'Temporary file not found or already cleaned up' });
      return;
    }

    const stat = fs.statSync(tempFilePath);

    // Set headers preserving original filename and MIME type compliant with RFC 6266
    // HTTP headers only allow ASCII in filename="...", so non-ASCII is sanitized for fallback
    // and full unicode filename is encoded in filename*=UTF-8''...
    const asciiFallback = file.name
      .replace(/[^\x20-\x7E]/g, '_')
      .replace(/["\\]/g, '_');
    const encodedFilename = encodeURIComponent(file.name);

    res.setHeader('Content-Type', file.type || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`
    );
    if (file.sha256) {
      res.setHeader('X-NOVA-SHA256', file.sha256);
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    file.status = 'downloading';
    let bytesSent = 0;
    let lastProgressTime = Date.now();
    let lastProgressBytes = 0;

    const readStream = fs.createReadStream(tempFilePath);

    readStream.on('data', (chunk: string | Buffer) => {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      bytesSent += buffer.length;
      file.bytesDownloaded = bytesSent;

      const now = Date.now();
      const elapsedMs = now - lastProgressTime;

      if (elapsedMs >= 200 || bytesSent === stat.size) {
        const deltaBytes = bytesSent - lastProgressBytes;
        const speedBps = elapsedMs > 0 ? (deltaBytes / elapsedMs) * 1000 : 0;
        const remainingBytes = Math.max(0, stat.size - bytesSent);
        const etaSeconds = speedBps > 0 ? Math.ceil(remainingBytes / speedBps) : 0;

        this.wsHandler.notifyProgress(
          sessionId,
          fileId,
          bytesSent,
          stat.size,
          'download',
          speedBps,
          etaSeconds
        );

        lastProgressTime = now;
        lastProgressBytes = bytesSent;
      }
    });

    try {
      await pipeline(readStream, res);

      // Download completed
      file.status = 'verified'; // Set ready for confirmation
    } catch (err) {
      console.error(`Download streaming interrupted for ${file.name}:`, err);
      file.status = 'failed';
      file.error = (err as Error).message;
    }
  }

  /**
   * Confirms SHA-256 verification and records transfer history
   */
  public async confirmVerification(
    sessionId: string,
    fileId: string,
    receiverHash?: string
  ): Promise<{ verified: boolean; sha256: string; error?: string }> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return { verified: false, sha256: '', error: 'Session not found' };
    }

    const file = this.sessionManager.getFile(sessionId, fileId);
    if (!file || !file.sha256) {
      return { verified: false, sha256: '', error: 'File hash not available' };
    }

    let isMatch = true;
    if (receiverHash) {
      isMatch = verifyHash(file.sha256, receiverHash);
    }

    if (isMatch) {
      file.status = 'verified';
      this.wsHandler.notifyFileVerified(sessionId, fileId, file.sha256, true);

      const durationMs = (file.completedAt || Date.now()) - (file.startedAt || Date.now());
      const avgSpeed = durationMs > 0 ? (file.size / durationMs) * 1000 : 0;

      // Record in history for sender and receiver
      this.historyManager.addRecord({
        id: crypto.randomUUID(),
        sessionId,
        fileId,
        filename: file.name,
        fileSize: file.size,
        direction: 'receive',
        sha256: file.sha256,
        status: 'completed',
        timestamp: new Date().toISOString(),
        durationMs,
        avgSpeedBps: avgSpeed,
      });

      // Check if all files in session are verified
      const allFiles = Array.from(session.files.values());
      const allDone = allFiles.every(f => f.status === 'verified' || f.status === 'completed');
      if (allDone && allFiles.length > 0) {
        session.status = 'completed';
        this.wsHandler.notifySessionCompleted(sessionId);

        // Auto-cleanup if configured
        if (session.autoCleanup) {
          setTimeout(async () => {
            await this.storageManager.deleteSession(sessionId);
          }, 3000); // 3 second delay to ensure all reads finish cleanly
        }
      }

      return { verified: true, sha256: file.sha256 };
    } else {
      file.status = 'failed';
      file.error = 'SHA-256 hash mismatch between sender and receiver';
      this.wsHandler.notifyFileVerified(sessionId, fileId, file.sha256, false);

      this.historyManager.addRecord({
        id: crypto.randomUUID(),
        sessionId,
        fileId,
        filename: file.name,
        fileSize: file.size,
        direction: 'receive',
        sha256: file.sha256,
        status: 'failed',
        timestamp: new Date().toISOString(),
        durationMs: 0,
        avgSpeedBps: 0,
      });

      return { verified: false, sha256: file.sha256, error: 'SHA-256 checksum verification failed' };
    }
  }
}
