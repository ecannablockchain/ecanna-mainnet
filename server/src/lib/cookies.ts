import type { NextFunction, Request, Response } from "express";

/**
 * Minimal Cookie header parser (avoids extra deps). Suitable for httpOnly session cookies (e.g. JWT).
 */
export function parseCookieHeader(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (!name) continue;
    let value = part.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    } else {
      try {
        value = decodeURIComponent(value);
      } catch {
        /* keep raw */
      }
    }
    out[name] = value;
  }
  return out;
}

/** Populates `req.cookies` like `cookie-parser` (subset). */
export function attachCookies(req: Request, _res: Response, next: NextFunction) {
  req.cookies = parseCookieHeader(req.headers.cookie);
  next();
}
