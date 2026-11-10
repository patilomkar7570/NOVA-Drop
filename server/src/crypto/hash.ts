import crypto from 'crypto';
import fs from 'fs';
import { Transform, TransformCallback } from 'stream';

/**
 * Creates a Transform stream that computes the SHA-256 hash of the stream
 * while passing data through unaltered with zero byte modification.
 */
export class Sha256TransformStream extends Transform {
  private hash = crypto.createHash('sha256');
  private totalBytes = 0;

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.hash.update(chunk);
    this.totalBytes += chunk.length;
    callback(null, chunk);
  }

  getDigest(): string {
    return this.hash.digest('hex');
  }

  getBytesCount(): number {
    return this.totalBytes;
  }
}

/**
 * Computes SHA-256 checksum of an on-disk file using streaming
 */
export async function computeFileHash(filePath: string): Promise<{ hash: string; size: number }> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    let size = 0;
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk: string | Buffer) => {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      hash.update(buffer);
      size += buffer.length;
    });

    stream.on('end', () => {
      resolve({
        hash: hash.digest('hex'),
        size,
      });
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Compares two hashes in constant time to prevent timing attacks
 */
export function verifyHash(hashA: string, hashB: string): boolean {
  if (!hashA || !hashB || hashA.length !== hashB.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(hashA, 'hex'), Buffer.from(hashB, 'hex'));
}

/**
 * Generates a cryptographically secure random session token
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generates a cryptographically secure 6-digit pairing code (e.g., "749-182")
 */
export function generatePairingCode(): string {
  // Use crypto.randomInt for uniform distribution between 100000 and 999999
  const codeNum = crypto.randomInt(100000, 1000000);
  const codeStr = codeNum.toString();
  return `${codeStr.slice(0, 3)}-${codeStr.slice(3)}`;
}
