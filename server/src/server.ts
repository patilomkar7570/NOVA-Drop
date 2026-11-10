import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { CONFIG, APP_VERSION, PRODUCT_NAME, TAGLINE } from './config.js';
import { StorageManager } from './storage/StorageManager.js';
import { RateLimiter } from './session/RateLimiter.js';
import { SessionManager } from './session/SessionManager.js';
import { HistoryManager } from './history/HistoryManager.js';
import { WebSocketHandler } from './realtime/WebSocketServer.js';
import { StreamEngine } from './engine/StreamEngine.js';

import { createSessionRoutes } from './routes/sessionRoutes.js';
import { createTransferRoutes } from './routes/transferRoutes.js';
import { createHistoryRoutes } from './routes/historyRoutes.js';
import { createSettingsRoutes } from './routes/settingsRoutes.js';
import { createSystemRoutes } from './routes/systemRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();
  const server = http.createServer(app);

  // Initialize Core Services
  const storageManager = new StorageManager(CONFIG.tempDirectory);
  const rateLimiter = new RateLimiter(5, 60 * 1000, 5 * 60 * 1000); // 5 tries/min -> 5 min lock
  const sessionManager = new SessionManager(storageManager, rateLimiter, CONFIG.sessionTimeoutMinutes);
  const historyManager = new HistoryManager(path.dirname(CONFIG.tempDirectory), CONFIG.historyEnabled);
  const wsHandler = new WebSocketHandler(server, sessionManager);
  const streamEngine = new StreamEngine(storageManager, sessionManager, historyManager, wsHandler);

  // Middleware - Allow localhost and private local Wi-Fi network IPs
  app.use(cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
          origin
        )
      ) {
        callback(null, true);
      } else {
        callback(new Error('Cross-origin requests blocked by NOVA Drop privacy policy'));
      }
    },
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'Content-Length', 'X-NOVA-SHA256'],
  }));

  // Diagnostic request logger for transparency and debugging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/api') || req.path.includes('/download')) {
        const duration = Date.now() - start;
        console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // JSON parser for non-upload endpoints
  app.use((req, res, next) => {
    if (req.path.includes('/upload')) {
      // Do not parse json or body for streaming uploads
      return next();
    }
    express.json({ limit: '10mb' })(req, res, next);
  });

  // Versioned API v1 Routes
  const apiV1 = express.Router();
  apiV1.use('/sessions', createSessionRoutes(sessionManager, streamEngine, wsHandler));
  apiV1.use('/transfers', createTransferRoutes(sessionManager));
  apiV1.use('/history', createHistoryRoutes(historyManager));
  apiV1.use('/settings', createSettingsRoutes(storageManager, historyManager));
  apiV1.use('/system', createSystemRoutes(storageManager, sessionManager));

  app.use('/api/v1', apiV1);

  // Legacy or shortcut redirect /api to /api/v1
  app.use('/api', apiV1);

  // Serve static client assets (both development client/dist or server/public)
  const clientPublicDir = path.resolve(__dirname, '../public');
  const clientDistDir = path.resolve(__dirname, '../../client/dist');
  const staticDir = fs.existsSync(clientPublicDir) ? clientPublicDir : clientDistDir;

  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    // SPA fallback
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
        return next();
      }
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  } else {
    // If frontend is running on Vite dev server (e.g. 5173), provide helpful landing
    app.get('/', (_req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>${PRODUCT_NAME} API</title></head>
        <body style="background:#0B0D13;color:#F3F4F6;font-family:sans-serif;padding:40px;text-align:center;">
          <h1 style="color:#8B5CF6;">${PRODUCT_NAME} API v1</h1>
          <p>${TAGLINE}</p>
          <p style="color:#9CA3AF;">Server running on http://${CONFIG.host}:${CONFIG.port}. Start the client dev server with <code>npm run dev:client</code> or build with <code>npm run build</code>.</p>
        </body>
        </html>
      `);
    });
  }

  return { app, server, sessionManager, storageManager, historyManager, streamEngine, wsHandler };
}

// Start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  const { server } = createApp();

  server.listen(CONFIG.port, CONFIG.host, () => {
    console.log(`
======================================================
  ${PRODUCT_NAME} — Phase 1: PC Web Edition
  Version ${APP_VERSION}
  "${TAGLINE}"
======================================================
  [+] Server active at: http://${CONFIG.host}:${CONFIG.port}
  [+] Mode: Localhost Only (Strict Privacy)
  [+] Cloud Sync: DISABLED
  [+] Telemetry: DISABLED
  [+] Compression: DISABLED (Byte-for-byte fidelity)
  [+] Temp Directory: ${CONFIG.tempDirectory}
======================================================
`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[!] Shutting down NOVA Drop gracefully...');
    server.close(() => {
      console.log('[-] Server stopped.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
