import { Router, Request, Response } from 'express';
import { StorageManager } from '../storage/StorageManager.js';
import { HistoryManager } from '../history/HistoryManager.js';
import { CONFIG, APP_VERSION } from '../config.js';

export function createSettingsRoutes(
  storageManager: StorageManager,
  historyManager: HistoryManager
): Router {
  const router = Router();

  // Get current settings
  router.get('/', async (_req: Request, res: Response) => {
    const stats = await storageManager.getStorageStats();
    res.json({
      version: APP_VERSION,
      host: CONFIG.host,
      port: CONFIG.port,
      tempDirectory: storageManager.getTempDir(),
      autoCleanupOnFinish: CONFIG.autoCleanupOnFinish,
      sessionTimeoutMinutes: CONFIG.sessionTimeoutMinutes,
      historyEnabled: historyManager.isEnabled(),
      historyRetentionDays: CONFIG.historyRetentionDays,
      tempStorageBytes: stats.totalBytes,
      tempStorageFileCount: stats.fileCount,
    });
  });

  // Update settings
  router.patch('/', (req: Request, res: Response) => {
    const {
      autoCleanupOnFinish,
      sessionTimeoutMinutes,
      historyEnabled,
      historyRetentionDays,
      tempDirectory,
    } = req.body;

    if (typeof autoCleanupOnFinish === 'boolean') {
      CONFIG.autoCleanupOnFinish = autoCleanupOnFinish;
    }
    if (typeof sessionTimeoutMinutes === 'number' && sessionTimeoutMinutes > 0) {
      CONFIG.sessionTimeoutMinutes = sessionTimeoutMinutes;
    }
    if (typeof historyEnabled === 'boolean') {
      CONFIG.historyEnabled = historyEnabled;
      historyManager.setEnabled(historyEnabled);
    }
    if (typeof historyRetentionDays === 'number' && historyRetentionDays > 0) {
      CONFIG.historyRetentionDays = historyRetentionDays;
    }
    if (typeof tempDirectory === 'string' && tempDirectory.trim().length > 0) {
      storageManager.setTempDir(tempDirectory);
      CONFIG.tempDirectory = storageManager.getTempDir();
    }

    res.json({
      success: true,
      settings: {
        tempDirectory: storageManager.getTempDir(),
        autoCleanupOnFinish: CONFIG.autoCleanupOnFinish,
        sessionTimeoutMinutes: CONFIG.sessionTimeoutMinutes,
        historyEnabled: historyManager.isEnabled(),
        historyRetentionDays: CONFIG.historyRetentionDays,
      },
    });
  });

  // Manually purge temporary files
  router.post('/clear-temp', async (_req: Request, res: Response) => {
    try {
      const { filesRemoved, bytesFreed } = await storageManager.clearAll();
      res.json({
        success: true,
        filesRemoved,
        bytesFreed,
        message: `Cleared ${filesRemoved} temporary files (${bytesFreed} bytes freed)`,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
