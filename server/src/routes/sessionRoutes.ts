import { Router, Request, Response } from 'express';
import { SessionManager } from '../session/SessionManager.js';
import { StreamEngine } from '../engine/StreamEngine.js';
import { WebSocketHandler } from '../realtime/WebSocketServer.js';

function getParam(req: Request, paramName: string): string {
  const val = req.params[paramName];
  if (Array.isArray(val)) {
    return val[0] || '';
  }
  return val || '';
}

export function createSessionRoutes(
  sessionManager: SessionManager,
  streamEngine: StreamEngine,
  wsHandler: WebSocketHandler
): Router {
  const router = Router();

  // Create a new transfer session
  router.post('/', (req: Request, res: Response) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const timeoutMinutes = req.body.timeoutMinutes ? parseInt(req.body.timeoutMinutes, 10) : undefined;

      const { session, senderToken } = sessionManager.createSession({
        timeoutMinutes,
        userAgent,
        ip: clientIp,
      });

      res.status(201).json({
        sessionId: session.id,
        pairingCode: session.pairingCode,
        token: senderToken,
        role: 'sender',
        expiresAt: session.expiresAt,
        session: sessionManager.toDTO(session),
      });
    } catch (err) {
      console.error('Failed to create session:', err);
      res.status(500).json({ error: 'Failed to create transfer session' });
    }
  });

  // Join an existing session via temporary pairing code
  router.post('/join', (req: Request, res: Response) => {
    try {
      const { pairingCode } = req.body;
      if (!pairingCode) {
        res.status(400).json({ error: 'Pairing code is required' });
        return;
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];

      const result = sessionManager.joinSession(pairingCode, {
        userAgent,
        ip: clientIp,
      });

      if (!result.success || !result.session) {
        res.status(403).json({
          error: result.error || 'Failed to join session',
          retryAfterSeconds: result.retryAfterSeconds,
        });
        return;
      }

      // Notify sender via WebSocket
      wsHandler.broadcastToRoom(result.session.id, {
        type: 'peer_joined',
        role: 'receiver',
        sessionId: result.session.id,
      });

      res.status(200).json({
        sessionId: result.session.id,
        pairingCode: result.session.pairingCode,
        token: result.receiverToken,
        role: 'receiver',
        expiresAt: result.session.expiresAt,
        session: sessionManager.toDTO(result.session),
      });
    } catch (err) {
      console.error('Failed to join session:', err);
      res.status(500).json({ error: 'Internal server error while joining session' });
    }
  });

  // Get session details
  router.get('/:id', (req: Request, res: Response) => {
    const id = getParam(req, 'id');
    const session = sessionManager.getSession(id);
    if (!session) {
      res.status(404).json({ error: 'Session not found or expired' });
      return;
    }
    res.json(sessionManager.toDTO(session));
  });

  // Register file manifest for a session
  router.post('/:id/files', (req: Request, res: Response) => {
    try {
      const id = getParam(req, 'id');
      const { files } = req.body;
      if (!Array.isArray(files) || files.length === 0) {
        res.status(400).json({ error: 'Array of files is required' });
        return;
      }

      const added = sessionManager.addFiles(id, files);
      const session = sessionManager.getSession(id);

      if (session) {
        wsHandler.broadcastToRoom(session.id, {
          type: 'files_offered',
          files: added,
        });
      }

      res.status(200).json({
        success: true,
        files: added,
      });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Receiver accepts transfer
  router.post('/:id/accept', (req: Request, res: Response) => {
    const id = getParam(req, 'id');
    const session = sessionManager.getSession(id);
    if (!session) {
      res.status(404).json({ error: 'Session not found or expired' });
      return;
    }

    session.status = 'transferring';
    wsHandler.broadcastToRoom(session.id, {
      type: 'transfer_accepted',
    });

    res.json({ success: true, status: session.status });
  });

  // Receiver rejects transfer
  router.post('/:id/reject', (req: Request, res: Response) => {
    const id = getParam(req, 'id');
    const session = sessionManager.getSession(id);
    if (!session) {
      res.status(404).json({ error: 'Session not found or expired' });
      return;
    }

    const { reason } = req.body;
    session.status = 'cancelled';
    wsHandler.broadcastToRoom(session.id, {
      type: 'transfer_rejected',
      reason: reason || 'Transfer declined by receiver',
    });

    res.json({ success: true, status: session.status });
  });

  // Cancel session
  router.post('/:id/cancel', async (req: Request, res: Response) => {
    const id = getParam(req, 'id');
    const success = await sessionManager.cancelSession(id);
    if (!success) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    wsHandler.notifySessionCancelled(id);
    res.json({ success: true, message: 'Session cancelled and temporary data cleaned up' });
  });

  // Stream upload file
  router.post('/:id/files/:fileId/upload', async (req: Request, res: Response) => {
    const id = getParam(req, 'id');
    const fileId = getParam(req, 'fileId');
    await streamEngine.handleUploadStream(id, fileId, req, res);
  });

  // Stream download file
  router.get('/:id/files/:fileId/download', async (req: Request, res: Response) => {
    const id = getParam(req, 'id');
    const fileId = getParam(req, 'fileId');
    await streamEngine.handleDownloadStream(id, fileId, req, res);
  });

  // Confirm verification
  router.post('/:id/files/:fileId/verify', async (req: Request, res: Response) => {
    const id = getParam(req, 'id');
    const fileId = getParam(req, 'fileId');
    const { receiverHash } = req.body;
    const result = await streamEngine.confirmVerification(
      id,
      fileId,
      receiverHash
    );

    if (result.verified) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  });

  return router;
}
