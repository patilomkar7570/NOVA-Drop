interface RateLimitEntry {
  failures: number;
  firstFailureTime: number;
  blockedUntil: number;
}

export class RateLimiter {
  private entries = new Map<string, RateLimitEntry>();
  private readonly maxFailures: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;

  constructor(
    maxFailures = 5,
    windowMs = 60 * 1000, // 1 minute window
    blockDurationMs = 5 * 60 * 1000 // 5 minutes block
  ) {
    this.maxFailures = maxFailures;
    this.windowMs = windowMs;
    this.blockDurationMs = blockDurationMs;

    // Periodic sweep every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  isBlocked(key: string): { blocked: boolean; retryAfterSeconds: number } {
    const entry = this.entries.get(key);
    if (!entry) {
      return { blocked: false, retryAfterSeconds: 0 };
    }

    const now = Date.now();
    if (entry.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
      return { blocked: true, retryAfterSeconds };
    }

    // Block period expired
    if (entry.blockedUntil > 0 && entry.blockedUntil <= now) {
      this.entries.delete(key);
      return { blocked: false, retryAfterSeconds: 0 };
    }

    return { blocked: false, retryAfterSeconds: 0 };
  }

  recordAttempt(key: string, success: boolean): void {
    const now = Date.now();
    let entry = this.entries.get(key);

    if (success) {
      // Clear on success
      this.entries.delete(key);
      return;
    }

    if (!entry) {
      entry = {
        failures: 1,
        firstFailureTime: now,
        blockedUntil: 0,
      };
      this.entries.set(key, entry);
      return;
    }

    // Reset window if it has passed
    if (now - entry.firstFailureTime > this.windowMs) {
      entry.failures = 1;
      entry.firstFailureTime = now;
      entry.blockedUntil = 0;
      return;
    }

    entry.failures += 1;

    if (entry.failures >= this.maxFailures) {
      entry.blockedUntil = now + this.blockDurationMs;
    }
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries.entries()) {
      if (entry.blockedUntil > 0 && entry.blockedUntil <= now) {
        this.entries.delete(key);
      } else if (entry.blockedUntil === 0 && now - entry.firstFailureTime > this.windowMs) {
        this.entries.delete(key);
      }
    }
  }
}
