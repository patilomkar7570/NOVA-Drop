import { WebSocket, WebSocketServer as WSServer } from 'ws';
import { Server as HttpServer } from 'http';
import { SessionManager } from '../session/SessionManager.js';

interface ClientConnection {
  ws: WebSocket;
  sessionId: string;
  role: 'sender' | 'receiver';
  token: string;
  isAlive: boolean;
}

export class WebSocketHandler {
  private wss: WSServer;
  private sessionRooms = new Map<string, Set<ClientConnection>>();
  private sessionManager: SessionManager;

  constructor(server: HttpServer, sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
    this.wss = new WSServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    // Heartbeat check every 30 seconds
    const interval = setInterval(() => {
      for (const room of this.sessionRooms.values()) {
        for (const client of room) {
          if (!client.isAlive) {
            client.ws.terminate();
            room.delete(client);
            continue;
          }
          client.isAlive = false;
          client.ws.ping();
        }
      }
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  private handleConnection(ws: WebSocket): void {
    let clientRef: ClientConnection | null = null;

    ws.on('pong', () => {
      if (clientRef) clientRef.isAlive = true;
    });

    ws.on('message', (messageRaw: string | Buffer) => {
      try {
        const data = JSON.parse(messageRaw.toString());
        const { type } = data;

        if (type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          return;
        }

        if (type === 'join_session') {
          const { sessionId, role, token } = data;
          if (!sessionId || !role) {
            ws.send(JSON.stringify({ type: 'error', message: 'Missing sessionId or role' }));
            return;
          }

          const session = this.sessionManager.getSession(sessionId);
          if (!session) {
            ws.send(JSON.stringify({ type: 'error', message: 'Session not found or expired' }));
            return;
          }

          let room = this.sessionRooms.get(sessionId);
          if (!room) {
            room = new Set();
            this.sessionRooms.set(sessionId, room);
          }

          clientRef = {
            ws,
            sessionId,
            role,
            token: token || '',
            isAlive: true,
          };
          room.add(clientRef);

          ws.send(JSON.stringify({
            type: 'session_joined',
            sessionId,
            role,
            session: this.sessionManager.toDTO(session),
          }));

          // Notify the other peer
          if (role === 'receiver') {
            this.broadcastToRoom(sessionId, {
              type: 'peer_joined',
              role: 'receiver',
              sessionId,
            }, ws);
          } else if (role === 'sender') {
            this.broadcastToRoom(sessionId, {
              type: 'peer_joined',
              role: 'sender',
              sessionId,
            }, ws);
          }
        }

        if (type === 'files_offered') {
          if (clientRef) {
            this.broadcastToRoom(clientRef.sessionId, {
              type: 'files_offered',
              files: data.files,
            }, ws);
          }
        }

        if (type === 'transfer_accept') {
          if (clientRef) {
            this.broadcastToRoom(clientRef.sessionId, {
              type: 'transfer_accepted',
            }, ws);
          }
        }

        if (type === 'transfer_reject') {
          if (clientRef) {
            this.broadcastToRoom(clientRef.sessionId, {
              type: 'transfer_rejected',
              reason: data.reason || 'Transfer rejected by receiver',
            }, ws);
          }
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      if (clientRef) {
        const room = this.sessionRooms.get(clientRef.sessionId);
        if (room) {
          room.delete(clientRef);
          if (room.size === 0) {
            this.sessionRooms.delete(clientRef.sessionId);
          } else {
            this.broadcastToRoom(clientRef.sessionId, {
              type: 'peer_disconnected',
              role: clientRef.role,
            });
          }
        }
      }
    });
  }

  public broadcastToRoom(sessionId: string, payload: unknown, excludeWs?: WebSocket): void {
    const room = this.sessionRooms.get(sessionId);
    if (!room) return;

    const data = JSON.stringify(payload);
    for (const client of room) {
      if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  public notifyProgress(
    sessionId: string,
    fileId: string,
    bytesTransferred: number,
    totalBytes: number,
    direction: 'upload' | 'download',
    speedBps: number,
    etaSeconds: number
  ): void {
    const percent = totalBytes > 0 ? Math.min(100, Math.round((bytesTransferred / totalBytes) * 100)) : 0;
    this.broadcastToRoom(sessionId, {
      type: 'transfer_progress',
      fileId,
      bytesTransferred,
      totalBytes,
      percent,
      direction,
      speedBps,
      etaSeconds,
    });
  }

  public notifyFileReady(sessionId: string, fileId: string, sha256: string): void {
    this.broadcastToRoom(sessionId, {
      type: 'file_ready',
      fileId,
      sha256,
    });
  }

  public notifyFileVerified(sessionId: string, fileId: string, sha256: string, verified: boolean): void {
    this.broadcastToRoom(sessionId, {
      type: 'file_verified',
      fileId,
      sha256,
      verified,
    });
  }

  public notifySessionCompleted(sessionId: string): void {
    this.broadcastToRoom(sessionId, {
      type: 'session_completed',
      sessionId,
    });
  }

  public notifySessionCancelled(sessionId: string): void {
    this.broadcastToRoom(sessionId, {
      type: 'session_cancelled',
      sessionId,
    });
  }
}
