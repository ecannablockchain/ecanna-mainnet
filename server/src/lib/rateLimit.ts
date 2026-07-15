import type { NextFunction, Request, Response } from "express";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientKey(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0]!.trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}

/** Simple in-memory rate limit (per process). Use Nginx limit_req at scale. */
export function createRateLimiter(windowMs: number, max: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/health" || req.path === "/api/v1/health") {
      next();
      return;
    }
    const key = clientKey(req);
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    if (bucket.count > max) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }
    next();
  };
}
