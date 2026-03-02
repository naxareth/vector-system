// ---------------------------------------------------------------------------
// Rate Limiter — Checkpoint #2 Security Mitigation
//
// In-memory sliding window rate limiter keyed by IP address.
// Designed for public endpoints (e.g. /api/verify) to prevent abuse.
//
// NOTE: In-memory = resets on server restart and is per-instance.
// For production multi-instance deployments, replace with Redis-based
// rate limiting (e.g. @upstash/ratelimit).
// ---------------------------------------------------------------------------

interface WindowEntry {
    /** Timestamps of requests within the current window */
    timestamps: number[];
}

export interface RateLimitResult {
    /** Whether the request is allowed */
    allowed: boolean;
    /** Milliseconds until the client can retry (0 if allowed) */
    retryAfterMs: number;
    /** Number of remaining requests in the current window */
    remaining: number;
}

export class RateLimiter {
    private windows = new Map<string, WindowEntry>();
    private readonly windowMs: number;
    private readonly maxRequests: number;
    private cleanupTimer: ReturnType<typeof setInterval> | null = null;

    /**
     * @param windowMs   Sliding window duration in milliseconds (default: 60_000 = 1 min)
     * @param maxRequests Maximum requests per window per key (default: 10)
     */
    constructor(windowMs = 60_000, maxRequests = 10) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;

        // Periodic cleanup of expired entries to prevent memory leaks
        this.cleanupTimer = setInterval(() => this.cleanup(), windowMs * 2);
        // Don't block Node.js from exiting
        if (this.cleanupTimer?.unref) {
            this.cleanupTimer.unref();
        }
    }

    /**
     * Check if a request from the given key (IP address) is allowed.
     */
    checkLimit(key: string): RateLimitResult {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        // Get or create the entry for this key
        let entry = this.windows.get(key);
        if (!entry) {
            entry = { timestamps: [] };
            this.windows.set(key, entry);
        }

        // Evict timestamps outside the current window
        entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

        if (entry.timestamps.length >= this.maxRequests) {
            // Rate limited — calculate when the earliest request in the window expires
            const oldestInWindow = entry.timestamps[0];
            const retryAfterMs = oldestInWindow + this.windowMs - now;

            return {
                allowed: false,
                retryAfterMs: Math.max(retryAfterMs, 0),
                remaining: 0,
            };
        }

        // Allowed — record this request
        entry.timestamps.push(now);

        return {
            allowed: true,
            retryAfterMs: 0,
            remaining: this.maxRequests - entry.timestamps.length,
        };
    }

    /**
     * Remove entries with no recent activity to free memory.
     */
    private cleanup(): void {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        for (const [key, entry] of this.windows.entries()) {
            // Remove timestamps outside window
            entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
            // If no timestamps remain, delete the entry entirely
            if (entry.timestamps.length === 0) {
                this.windows.delete(key);
            }
        }
    }

    /** Destroy the cleanup timer (for testing). */
    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
}

// ---------------------------------------------------------------------------
// Shared singleton for verification endpoints
// 10 requests per minute per IP
// ---------------------------------------------------------------------------
export const verifyRateLimiter = new RateLimiter(60_000, 10);
