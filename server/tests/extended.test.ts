import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { createApp } from '../src/server.js';
import { RateLimiter } from '../src/session/RateLimiter.js';

describe('NOVA Drop Extended Transfer & Edge Case Tests', () => {
  let app: any;
  let server: any;
  let sessionManager: any;
  let storageManager: any;
  let tempTestDir: string;

  beforeEach(() => {
    tempTestDir = path.join(os.tmpdir(), `nova_ext_test_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(tempTestDir, { recursive: true });

    const created = createApp();
    app = created.app;
    server = created.server;
    sessionManager = created.sessionManager;
    storageManager = created.storageManager;
    storageManager.setTempDir(tempTestDir);
  });

  afterEach(() => {
    if (server && server.listening) {
      server.close();
    }
    try {
      if (fs.existsSync(tempTestDir)) {
        fs.rmSync(tempTestDir, { recursive: true, force: true });
      }
    } catch {}
  });

  it('rejects download attempts for non-existent sessions or files', async () => {
    const res1 = await request(app).get('/api/v1/sessions/fake-session/files/fake-file/download');
    expect(res1.status).toBe(404);

    const createRes = await request(app).post('/api/v1/sessions').send();
    const { sessionId } = createRes.body;

    const res2 = await request(app).get(`/api/v1/sessions/${sessionId}/files/non-existent-file/download`);
    expect(res2.status).toBe(404);
  });

  it('updates settings and enforces history disable flag', async () => {
    // Disable history
    const patchRes = await request(app)
      .patch('/api/v1/settings')
      .send({ historyEnabled: false });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.settings.historyEnabled).toBe(false);

    // Verify system settings reflects it
    const settingsRes = await request(app).get('/api/v1/settings');
    expect(settingsRes.body.historyEnabled).toBe(false);

    // Re-enable
    await request(app).patch('/api/v1/settings').send({ historyEnabled: true });
  });

  it('handles parallel uploads safely with separate files', async () => {
    const createRes = await request(app).post('/api/v1/sessions').send();
    const { sessionId } = createRes.body;

    const files = [
      { name: 'parallel-1.dat', buffer: crypto.randomBytes(30000) },
      { name: 'parallel-2.dat', buffer: crypto.randomBytes(40000) },
      { name: 'parallel-3.dat', buffer: crypto.randomBytes(50000) },
    ];

    const manifestRes = await request(app)
      .post(`/api/v1/sessions/${sessionId}/files`)
      .send({
        files: files.map(f => ({ name: f.name, size: f.buffer.length, type: 'application/octet-stream' })),
      });

    const fileIds = manifestRes.body.files.map((f: any) => f.id);

    // Upload concurrently
    const uploadPromises = files.map((f, idx) => {
      return request(app)
        .post(`/api/v1/sessions/${sessionId}/files/${fileIds[idx]}/upload`)
        .set('Content-Type', 'application/octet-stream')
        .send(f.buffer);
    });

    const results = await Promise.all(uploadPromises);
    for (let i = 0; i < results.length; i++) {
      expect(results[i].status).toBe(200);
      const expectedHash = crypto.createHash('sha256').update(files[i].buffer).digest('hex');
      expect(results[i].body.sha256).toBe(expectedHash);
    }
  });

  it('sanitizes dangerous filenames and relativePaths against directory traversal', async () => {
    const createRes = await request(app).post('/api/v1/sessions').send();
    const { sessionId } = createRes.body;

    const dangerousFiles = [
      { name: '../../../etc/passwd', relativePath: '../../deep/../../etc/passwd', size: 100, type: 'text/plain' },
      { name: 'C:\\Windows\\System32\\cmd.exe', relativePath: 'C:\\bad\\path\\app.exe', size: 200, type: 'application/octet-stream' },
      { name: 'clean\0null.txt', relativePath: 'folder\0null/file.txt', size: 300, type: 'text/plain' },
    ];

    const res = await request(app)
      .post(`/api/v1/sessions/${sessionId}/files`)
      .send({ files: dangerousFiles });

    expect(res.status).toBe(200);
    const registered = res.body.files;
    expect(registered[0].name).toBe('passwd');
    expect(registered[0].relativePath).not.toContain('..');
    expect(registered[1].name).toBe('cmd.exe');
    expect(registered[1].relativePath).not.toContain(':');
    expect(registered[2].name).not.toContain('\0');
    expect(registered[2].relativePath).not.toContain('\0');
  });

  it('enforces rate limiter block without early expiration reset', () => {
    const limiter = new RateLimiter(3, 1000, 10000); // 3 fails, 1s window, 10s block
    const testIp = '192.168.1.99';

    limiter.recordAttempt(testIp, false);
    limiter.recordAttempt(testIp, false);
    limiter.recordAttempt(testIp, false);

    const check1 = limiter.isBlocked(testIp);
    expect(check1.blocked).toBe(true);

    // Another attempt while blocked must not reset the block
    limiter.recordAttempt(testIp, false);
    const check2 = limiter.isBlocked(testIp);
    expect(check2.blocked).toBe(true);
  });
});
