import "server-only";

/**
 * Minimal in-memory fixed-window rate limiter for Server Actions / API routes.
 *
 * Protects login / registration / OTP endpoints against brute-force and SMS
 * abuse. NOTE: on serverless (Vercel) each instance keeps its own counters,
 * so this is defense-in-depth — not a replacement for provider-side limits
 * (Firebase phone-auth quotas, WAF). For strict global limits put the app
 * behind Vercel Firewall / Cloudflare rate-limiting rules.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Prevent unbounded memory growth in long-lived processes.
const MAX_BUCKETS = 5000;

function prune(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
    if (buckets.size <= MAX_BUCKETS) break;
  }
}

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  prune(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count < limit) {
    existing.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
}

export async function clientIp(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim();
    return h.get("x-real-ip") ?? "unknown";
  } catch {
    return "unknown";
  }
}

// Presets
export const LOGIN_LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 }; // 10 tries / 10min per IP
export const REGISTER_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 }; // 5 regs / hour per IP
export const OTP_SEND_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 }; // 5 accounts / hour per phone (server-side)
