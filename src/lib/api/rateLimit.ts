import type { NextApiRequest, NextApiResponse } from "next";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanupAt = 0;

function getClientIp(req: NextApiRequest): string {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0] || "unknown";
  }

  return req.socket.remoteAddress || "unknown";
}

function cleanupExpiredBuckets(now: number) {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupAt = now;

  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function rateLimitRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  options: { key: string; limit: number; windowMs: number },
): boolean {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const bucketKey = `${options.key}:${getClientIp(req)}`;
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + options.windowMs });
    return true;
  }

  if (current.count >= options.limit) {
    res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000));
    res.status(429).json({ error: "Too many requests" });
    return false;
  }

  current.count += 1;
  return true;
}
