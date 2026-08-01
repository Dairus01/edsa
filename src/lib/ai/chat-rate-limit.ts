import "server-only";

import { createHash } from "node:crypto";

const WINDOW_MS = 10 * 60 * 1_000;
const MAX_REQUESTS_PER_WINDOW = 50;
const MAX_ENTRIES = 512;

type RateLimitEntry = {
  active: number;
  count: number;
  lastSeen: number;
  windowStartedAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

declare global {
  // The limiter is deliberately process-local and survives development reloads.
  var __edsaEzraRateLimitStore: RateLimitStore | undefined;
}

const store =
  globalThis.__edsaEzraRateLimitStore ?? new Map<string, RateLimitEntry>();

globalThis.__edsaEzraRateLimitStore = store;

function anonymizeIp(ipAddress: string) {
  return createHash("sha256")
    .update(`edsa-ezra:${ipAddress}`)
    .digest("hex")
    .slice(0, 20);
}

function prune(now: number) {
  for (const [key, entry] of store) {
    if (entry.active === 0 && now - entry.lastSeen > WINDOW_MS * 2) {
      store.delete(key);
    }
  }

  if (store.size <= MAX_ENTRIES) {
    return;
  }

  const inactiveEntries = [...store.entries()]
    .filter(([, entry]) => entry.active === 0)
    .sort(([, first], [, second]) => first.lastSeen - second.lastSeen);

  for (const [key] of inactiveEntries) {
    store.delete(key);

    if (store.size <= MAX_ENTRIES) {
      break;
    }
  }
}

export type EzraRateLimitResult =
  | {
      allowed: true;
      release: () => void;
      remaining: number;
    }
  | {
      allowed: false;
      reason: "concurrent" | "rate_limit";
      retryAfterSeconds: number;
    };

/**
 * Best-effort protection only: this in-memory window is not globally
 * authoritative across separate serverless instances. The route depends on
 * this small interface so a persistent Redis implementation can replace it.
 */
export function acquireEzraModelSlot(
  ipAddress: string,
  now = Date.now(),
): EzraRateLimitResult {
  prune(now);

  const key = anonymizeIp(ipAddress || "unknown");
  let entry = store.get(key);

  if (!entry) {
    entry = {
      active: 0,
      count: 0,
      lastSeen: now,
      windowStartedAt: now,
    };
    store.set(key, entry);
  }

  if (now - entry.windowStartedAt >= WINDOW_MS && entry.active === 0) {
    entry.count = 0;
    entry.windowStartedAt = now;
  }

  entry.lastSeen = now;

  if (entry.active > 0) {
    return {
      allowed: false,
      reason: "concurrent",
      retryAfterSeconds: 3,
    };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      reason: "rate_limit",
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((entry.windowStartedAt + WINDOW_MS - now) / 1_000),
      ),
    };
  }

  entry.active += 1;
  entry.count += 1;
  let released = false;

  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - entry.count,
    release: () => {
      if (released) {
        return;
      }

      released = true;
      entry.active = Math.max(0, entry.active - 1);
      entry.lastSeen = Date.now();
    },
  };
}
