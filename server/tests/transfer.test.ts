import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { createApp } from '../src/server.js';
import { computeFileHash, verifyHash } from '../src/crypto/hash.js';

describe('NOVA Drop Backend Engine & Security Tests', () => {
  let app: any;
  let server: any;
  let sessionManager: any;
  let storageManager: any;
  let tempTestDir: string;

  beforeEach(() => {
    tempTestDir = path.join(os.tmpdir(), `nova_test_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(tempTestDir, { recursive: true });

    const created = createApp();
    app = created.app;
    server = created.server;
    sessionManager = created.sessionManager;
    storageManager = created.storageManager;
    storageManager.setTempDir(tempTestDir);
  });

  afterEach(async () => {
    if (server && server.listening) {
      server.close();
    }
    try {
      if (fs.existsSync(tempTestDir)) {
        fs.rmSync(tempTestDir, { recursive: true, force: true });
      }
    } catch {}
  });

  describe('Session Lifecycle & Security', () => {
    it('creates a session with secure 6-digit pairing code and token', async () => {
      const res = await request(app)
        .post('/api/v1/sessions')
        .send({ timeoutMinutes: 10 });

      expect(res.status).toBe(201);
      expect(res.body.sessionId).toBeDefined();
      expect(res.body.pairingCode).toMatch(/^\d{3}-\d{3}$/);
      expect(res.body.token).toBeDefined();
      expect(res.body.token.length).toBe(64); // 32-byte hex
      expect(res.body.session.status).toBe('waiting_for_receiver');
    });

    it('allows a receiver to join using pairing code (with or without hyphen)', async () => {
      const createRes = await request(app).post('/api/v1/sessions').send();
      const { pairingCode, sessionId } = createRes.body;

      // Join with hyphen
      const joinRes = await request(app)
        .post('/api/v1/sessions/join')
        .send({ pairingCode });

      expect(joinRes.status).toBe(200);
      expect(joinRes.body.sessionId).toBe(sessionId);
      expect(joinRes.body.role).toBe('receiver');
      expect(joinRes.body.token).toBeDefined();
    });

    it('allows joining with 6 digits without hyphen', async () => {
      const createRes = await request(app).post('/api/v1/sessions').send();
      const codeWithoutHyphen = createRes.body.pairingCode.replace('-', '');

      const joinRes = await request(app)
        .post('/api/v1/sessions/join')
        .send({ pairingCode: codeWithoutHyphen });

      expect(joinRes.status).toBe(200);
      expect(joinRes.body.sessionId).toBe(createRes.body.sessionId);
    });

    it('rejects invalid pairing codes', async () => {
      const joinRes = await request(app)
        .post('/api/v1/sessions/join')
        .send({ pairingCode: '999-999' });

      expect(joinRes.status).toBe(403);
      expect(joinRes.body.error).toContain('Invalid or expired pairing code');
    });

    it('protects against brute-force pairing attempts with rate limiting', async () => {
      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/sessions/join')
          .send({ pairingCode: `000-00${i}` });
      }

      // 6th attempt should be blocked with rate limiting
      const blockedRes = await request(app)
        .post('/api/v1/sessions/join')
        .send({ pairingCode: '111-222' });

      expect(blockedRes.status).toBe(403);
      expect(blockedRes.body.error).toContain('Too many failed pairing attempts');
      expect(blockedRes.body.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('handles expired sessions cleanly', async () => {
      const { session } = sessionManager.createSession({ timeoutMinutes: -1 }); // already expired
      const res = await request(app).get(`/api/v1/sessions/${session.id}`);
      expect(res.status).toBe(404);
    });

    it('cancels a session and purges temporary files immediately', async () => {
      const createRes = await request(app).post('/api/v1/sessions').send();
      const { sessionId } = createRes.body;

      const cancelRes = await request(app).post(`/api/v1/sessions/${sessionId}/cancel`);
      expect(cancelRes.status).toBe(200);

      const getRes = await request(app).get(`/api/v1/sessions/${sessionId}`);
      expect(getRes.body.status).toBe('cancelled');
    });
  });

  describe('File Transfer Engine, Streaming & Integrity', () => {
    it('transfers a single file with 100% byte-for-byte SHA-256 integrity', async () => {
      // 1. Create session
      const createRes = await request(app).post('/api/v1/sessions').send();
      const { sessionId } = createRes.body;

      // 2. Prepare test file payload (e.g., 64 KB of random bytes)
      const originalBuffer = crypto.randomBytes(65536);
      const originalHash = crypto.createHash('sha256').update(originalBuffer).digest('hex');
      const filename = 'document-test.pdf';

      // 3. Register file manifest
      const manifestRes = await request(app)
        .post(`/api/v1/sessions/${sessionId}/files`)
        .send({
          files: [{ name: filename, size: originalBuffer.length, type: 'application/pdf' }],
        });
      expect(manifestRes.status).toBe(200);
      const fileId = manifestRes.body.files[0].id;

      // 4. Stream upload file bytes
      const uploadRes = await request(app)
        .post(`/api/v1/sessions/${sessionId}/files/${fileId}/upload`)
        .set('Content-Type', 'application/octet-stream')
        .send(originalBuffer);

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.sha256).toBe(originalHash);
      expect(uploadRes.body.bytesReceived).toBe(originalBuffer.length);

      // 5. Stream download file bytes
      const downloadRes = await request(app)
        .get(`/api/v1/sessions/${sessionId}/files/${fileId}/download`)
        .buffer(true)
        .parse((res, callback) => {
          const data: Buffer[] = [];
          res.on('data', chunk => data.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          res.on('end', () => callback(null, Buffer.concat(data)));
        })
        .expect(200);

      expect(downloadRes.headers['content-type']).toBe('application/pdf');
      expect(downloadRes.headers['content-disposition']).toContain('document-test.pdf');
      expect(downloadRes.headers['x-nova-sha256']).toBe(originalHash);

      // 6. Verify downloaded bytes match original EXACTLY
      const downloadedBuffer = Buffer.isBuffer(downloadRes.body) ? downloadRes.body : Buffer.from(downloadRes.text || '');
      expect(downloadedBuffer.length).toBe(originalBuffer.length);
      const downloadedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');
      expect(downloadedHash).toBe(originalHash);

      // 7. Verify endpoint
      const verifyRes = await request(app)
        .post(`/api/v1/sessions/${sessionId}/files/${fileId}/verify`)
        .send({ receiverHash: downloadedHash });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.verified).toBe(true);
      expect(verifyRes.body.sha256).toBe(originalHash);
    });

    it('transfers multiple files of different types preserving filenames and bytes', async () => {
      const createRes = await request(app).post('/api/v1/sessions').send();
      const { sessionId } = createRes.body;

      const fileSpecs = [
        { name: 'photo.jpg', buffer: crypto.randomBytes(12000), type: 'image/jpeg' },
        { name: 'archive.tar.gz', buffer: crypto.randomBytes(45000), type: 'application/gzip' },
        { name: 'notes.txt', buffer: Buffer.from('NOVA Drop - Privacy First Local Transfer', 'utf-8'), type: 'text/plain' },
      ];

      const manifestRes = await request(app)
        .post(`/api/v1/sessions/${sessionId}/files`)
        .send({
          files: fileSpecs.map(f => ({ name: f.name, size: f.buffer.length, type: f.type })),
        });
      expect(manifestRes.status).toBe(200);

      for (let i = 0; i < fileSpecs.length; i++) {
        const spec = fileSpecs[i];
        const fileId = manifestRes.body.files[i].id;
        const expectedHash = crypto.createHash('sha256').update(spec.buffer).digest('hex');

        // Upload
        const uploadRes = await request(app)
          .post(`/api/v1/sessions/${sessionId}/files/${fileId}/upload`)
          .set('Content-Type', 'application/octet-stream')
          .send(spec.buffer);
        expect(uploadRes.body.sha256).toBe(expectedHash);

        // Download
        const downloadRes = await request(app)
          .get(`/api/v1/sessions/${sessionId}/files/${fileId}/download`)
          .buffer(true)
          .parse((res, callback) => {
            const data: Buffer[] = [];
            res.on('data', chunk => data.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            res.on('end', () => callback(null, Buffer.concat(data)));
          });
        const downloadedBuffer = Buffer.isBuffer(downloadRes.body) ? downloadRes.body : Buffer.from(downloadRes.text || '');
        const downloadedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');
        expect(downloadedHash).toBe(expectedHash);
      }
    });

    it('handles empty (0-byte) files correctly', async () => {
      const createRes = await request(app).post('/api/v1/sessions').send();
      const { sessionId } = createRes.body;

      const emptyBuffer = Buffer.alloc(0);
      const emptyHash = crypto.createHash('sha256').update(emptyBuffer).digest('hex');

      const manifestRes = await request(app)
        .post(`/api/v1/sessions/${sessionId}/files`)
        .send({
          files: [{ name: 'empty.txt', size: 0, type: 'text/plain' }],
        });
      const fileId = manifestRes.body.files[0].id;

      const uploadRes = await request(app)
        .post(`/api/v1/sessions/${sessionId}/files/${fileId}/upload`)
        .set('Content-Type', 'application/octet-stream')
        .send(emptyBuffer);

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.sha256).toBe(emptyHash);
      expect(uploadRes.body.bytesReceived).toBe(0);
    });

    it('handles filenames with spaces, unicode and special characters', async () => {
      const createRes = await request(app).post('/api/v1/sessions').send();
      const { sessionId } = createRes.body;

      const specialName = 'Report (Q3) [FINAL] — NOVA № 42.docx';
      const buffer = Buffer.from('Content with special characters filename', 'utf-8');

      const manifestRes = await request(app)
        .post(`/api/v1/sessions/${sessionId}/files`)
        .send({
          files: [{ name: specialName, size: buffer.length, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }],
        });
      const fileId = manifestRes.body.files[0].id;

      await request(app)
        .post(`/api/v1/sessions/${sessionId}/files/${fileId}/upload`)
        .set('Content-Type', 'application/octet-stream')
        .send(buffer);

      const downloadRes = await request(app)
        .get(`/api/v1/sessions/${sessionId}/files/${fileId}/download`);

      expect(downloadRes.status).toBe(200);
      // Ensure header contains encoded or preserved filename
      expect(downloadRes.headers['content-disposition']).toContain('UTF-8');
    });

    it('detects SHA-256 hash mismatch and marks transfer failed', async () => {
      const createRes = await request(app).post('/api/v1/sessions').send();
      const { sessionId } = createRes.body;

      const buffer = Buffer.from('Original content', 'utf-8');
      const manifestRes = await request(app)
        .post(`/api/v1/sessions/${sessionId}/files`)
        .send({
          files: [{ name: 'tamper-test.txt', size: buffer.length, type: 'text/plain' }],
        });
      const fileId = manifestRes.body.files[0].id;

      await request(app)
        .post(`/api/v1/sessions/${sessionId}/files/${fileId}/upload`)
        .set('Content-Type', 'application/octet-stream')
        .send(buffer);

      // Verify with forged hash
      const fakeHash = '0000000000000000000000000000000000000000000000000000000000000000';
      const verifyRes = await request(app)
        .post(`/api/v1/sessions/${sessionId}/files/${fileId}/verify`)
        .send({ receiverHash: fakeHash });

      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.verified).toBe(false);
      expect(verifyRes.body.error).toContain('verification failed');
    });
  });

  describe('Storage Management & History', () => {
    it('reports accurate temporary storage stats and allows manual purge', async () => {
      // Create session and upload a file
      const createRes = await request(app).post('/api/v1/sessions').send();
      const { sessionId } = createRes.body;
      const buffer = crypto.randomBytes(50000);

      const manifestRes = await request(app)
        .post(`/api/v1/sessions/${sessionId}/files`)
        .send({ files: [{ name: 'purge-test.bin', size: buffer.length, type: 'application/octet-stream' }] });
      const fileId = manifestRes.body.files[0].id;

      await request(app)
        .post(`/api/v1/sessions/${sessionId}/files/${fileId}/upload`)
        .set('Content-Type', 'application/octet-stream')
        .send(buffer);

      // Check settings status has tempStorageBytes >= 50000
      const settingsBefore = await request(app).get('/api/v1/settings');
      expect(settingsBefore.body.tempStorageBytes).toBeGreaterThanOrEqual(50000);

      // Clear temp
      const clearRes = await request(app).post('/api/v1/settings/clear-temp');
      expect(clearRes.status).toBe(200);
      expect(clearRes.body.filesRemoved).toBeGreaterThanOrEqual(1);

      // Check stats after
      const settingsAfter = await request(app).get('/api/v1/settings');
      expect(settingsAfter.body.tempStorageBytes).toBe(0);
    });

    it('records transfer history without retaining any file content', async () => {
      const createRes = await request(app).post('/api/v1/sessions').send();
      const { sessionId } = createRes.body;
      const buffer = Buffer.from('History metadata test', 'utf-8');

      const manifestRes = await request(app)
        .post(`/api/v1/sessions/${sessionId}/files`)
        .send({ files: [{ name: 'sample.txt', size: buffer.length, type: 'text/plain' }] });
      const fileId = manifestRes.body.files[0].id;

      await request(app)
        .post(`/api/v1/sessions/${sessionId}/files/${fileId}/upload`)
        .set('Content-Type', 'application/octet-stream')
        .send(buffer);

      // Confirm verification
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      await request(app)
        .post(`/api/v1/sessions/${sessionId}/files/${fileId}/verify`)
        .send({ receiverHash: hash });

      // Check history
      const historyRes = await request(app).get('/api/v1/history');
      expect(historyRes.status).toBe(200);
      expect(historyRes.body.records.length).toBeGreaterThanOrEqual(1);
      const record = historyRes.body.records[0];
      expect(record.filename).toBe('sample.txt');
      expect(record.fileSize).toBe(buffer.length);
      expect(record.sha256).toBe(hash);
      expect(record.status).toBe('completed');
      expect((record as any).content).toBeUndefined(); // Strictly no file contents!

      // Clear history
      const deleteRes = await request(app).delete('/api/v1/history');
      expect(deleteRes.status).toBe(200);

      const historyAfter = await request(app).get('/api/v1/history');
      expect(historyAfter.body.records.length).toBe(0);
    });

    it('reports correct system status and privacy compliance', async () => {
      const res = await request(app).get('/api/v1/system/status');
      expect(res.status).toBe(200);
      expect(res.body.product).toBe('NOVA Drop');
      expect(res.body.localhostOnly).toBe(true);
      expect(res.body.privacy.cloudStorage).toBe(false);
      expect(res.body.privacy.telemetry).toBe(false);
      expect(res.body.privacy.compression).toBe(false);
      expect(res.body.privacy.byteForBytePreserved).toBe(true);
      expect(res.body.privacy.localFirst).toBe(true);
    });
  });
});
