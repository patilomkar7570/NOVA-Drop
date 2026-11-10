import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { createApp } from '../src/server.js';

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
});
