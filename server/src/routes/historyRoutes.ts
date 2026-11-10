import { Router, Request, Response } from 'express';
import { HistoryManager } from '../history/HistoryManager.js';

export function createHistoryRoutes(historyManager: HistoryManager): Router {
  const router = Router();

  // Get transfer history
  router.get('/', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const result = historyManager.getRecords(limit, offset);
    res.json({
      records: result.records,
      total: result.total,
      enabled: historyManager.isEnabled(),
    });
  });

  // Clear transfer history
  router.delete('/', (_req: Request, res: Response) => {
    historyManager.clearHistory();
    res.json({ success: true, message: 'Transfer history cleared' });
  });

  return router;
}
