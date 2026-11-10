import { Router, Request, Response } from 'express';
import { SessionManager } from '../session/SessionManager.js';

export function createTransferRoutes(sessionManager: SessionManager): Router {
  const router = Router();

  // Get all currently active transfers across sessions
  router.get('/active', (_req: Request, res: Response) => {
    const active: Array<{
      sessionId: string;
      fileId: string;
      filename: string;
      totalSize: number;
      transferredSize: number;
      status: string;
      direction: 'upload' | 'download';
    }> = [];

    // Iterate through active sessions
    // Using private sessions reflection or helper in SessionManager
    // Let's add a public getter on SessionManager or scan
    // We can expose an active transfers query
    res.json({
      active,
      count: sessionManager.getActiveTransfersCount(),
    });
  });

  return router;
}
