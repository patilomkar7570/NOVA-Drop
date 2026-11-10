import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const rm = promisify(fs.rm);

export class StorageManager {
  private tempDir: string;

  constructor(tempDir: string) {
    this.tempDir = path.resolve(tempDir);
    this.ensureTempDir();
  }

  public getTempDir(): string {
    return this.tempDir;
  }

  public setTempDir(newDir: string): void {
    this.tempDir = path.resolve(newDir);
    this.ensureTempDir();
  }

  public ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true, mode: 0o700 });
    }
  }

  public getSessionDir(sessionId: string): string {
    // Sanitize sessionId to alphanumeric and dashes only to prevent path traversal
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9-]/g, '');
    const sessionDir = path.join(this.tempDir, `session_${safeSessionId}`);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true, mode: 0o700 });
    }
    return sessionDir;
  }

  public getFilePath(sessionId: string, fileId: string): string {
    const sessionDir = this.getSessionDir(sessionId);
    const safeFileId = fileId.replace(/[^a-zA-Z0-9-]/g, '');
    return path.join(sessionDir, `file_${safeFileId}.tmp`);
  }

  public fileExists(sessionId: string, fileId: string): boolean {
    const filePath = this.getFilePath(sessionId, fileId);
    return fs.existsSync(filePath);
  }

  public async deleteFile(sessionId: string, fileId: string): Promise<void> {
    try {
      const filePath = this.getFilePath(sessionId, fileId);
      if (fs.existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch (err) {
      console.error(`Failed to delete temporary file ${fileId} in session ${sessionId}:`, err);
    }
  }

  public async deleteSession(sessionId: string): Promise<void> {
    try {
      const safeSessionId = sessionId.replace(/[^a-zA-Z0-9-]/g, '');
      const sessionDir = path.join(this.tempDir, `session_${safeSessionId}`);
      if (fs.existsSync(sessionDir)) {
        await rm(sessionDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.error(`Failed to delete session directory for ${sessionId}:`, err);
    }
  }

  public async clearAll(): Promise<{ filesRemoved: number; bytesFreed: number }> {
    let filesRemoved = 0;
    let bytesFreed = 0;

    try {
      this.ensureTempDir();
      const entries = await readdir(this.tempDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(this.tempDir, entry.name);
        try {
          if (entry.isDirectory()) {
            const innerFiles = await readdir(fullPath, { withFileTypes: true });
            for (const file of innerFiles) {
              const fileFullPath = path.join(fullPath, file.name);
              const fileStat = await stat(fileFullPath);
              bytesFreed += fileStat.size;
              filesRemoved += 1;
              await unlink(fileFullPath);
            }
            await rm(fullPath, { recursive: true, force: true });
          } else {
            const fileStat = await stat(fullPath);
            bytesFreed += fileStat.size;
            filesRemoved += 1;
            await unlink(fullPath);
          }
        } catch (itemErr) {
          console.error(`Error removing temp entry ${fullPath}:`, itemErr);
        }
      }
    } catch (err) {
      console.error('Error clearing temporary storage:', err);
    }

    return { filesRemoved, bytesFreed };
  }

  public async getStorageStats(): Promise<{ totalBytes: number; fileCount: number }> {
    let totalBytes = 0;
    let fileCount = 0;

    try {
      if (!fs.existsSync(this.tempDir)) {
        return { totalBytes: 0, fileCount: 0 };
      }

      const entries = await readdir(this.tempDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(this.tempDir, entry.name);
        if (entry.isDirectory()) {
          const files = await readdir(fullPath, { withFileTypes: true });
          for (const file of files) {
            const filePath = path.join(fullPath, file.name);
            const fileStat = await stat(filePath);
            totalBytes += fileStat.size;
            fileCount += 1;
          }
        } else {
          const fileStat = await stat(fullPath);
          totalBytes += fileStat.size;
          fileCount += 1;
        }
      }
    } catch (err) {
      console.error('Error reading storage stats:', err);
    }

    return { totalBytes, fileCount };
  }
}
