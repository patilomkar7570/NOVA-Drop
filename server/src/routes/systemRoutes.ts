import { Router, Request, Response } from 'express';
import os from 'os';
import { StorageManager } from '../storage/StorageManager.js';
import { SessionManager } from '../session/SessionManager.js';
import { CONFIG, APP_VERSION, PRODUCT_NAME, TAGLINE } from '../config.js';

export function createSystemRoutes(
  storageManager: StorageManager,
  sessionManager: SessionManager
): Router {
  const router = Router();

  router.get('/status', async (_req: Request, res: Response) => {
    const stats = await storageManager.getStorageStats();

    res.json({
      product: PRODUCT_NAME,
      tagline: TAGLINE,
      version: APP_VERSION,
      status: 'online',
      host: CONFIG.host,
      port: CONFIG.port,
      localIp: CONFIG.localIp,
      localWifiUrl: `http://${CONFIG.localIp}:${CONFIG.port}`,
      localhostOnly: CONFIG.host === '127.0.0.1' || CONFIG.host === 'localhost',
      uptimeSeconds: Math.floor(process.uptime()),
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsageBytes: process.memoryUsage().heapUsed,
      systemFreeMemoryBytes: os.freemem(),
      systemTotalMemoryBytes: os.totalmem(),
      tempStorageBytes: stats.totalBytes,
      tempStorageFileCount: stats.fileCount,
      activeSessions: sessionManager.getActiveSessionsCount(),
      activeTransfers: sessionManager.getActiveTransfersCount(),
      privacy: {
        cloudStorage: false,
        telemetry: false,
        analytics: false,
        compression: false,
        byteForBytePreserved: true,
        sha256Verified: true,
        localFirst: true,
      },
    });
  });

  return router;
}
