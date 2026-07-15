import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const COOKIE_NAME = "ecna_site";
const BCRYPT_ROUNDS = 11;
const TOKEN_DAYS = 7;

function authSecret(): string {
  const s = process.env.SITE_AUTH_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SITE_AUTH_SECRET is required in production");
  }
  return "dev-only-site-auth-secret-change-me";
}

function cookieOpts(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "none";
  maxAge: number;
  path: string;
} {
  const secure = process.env.SITE_AUTH_COOKIE_SECURE === "1";
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge: TOKEN_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function registerSiteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as Record<string, unknown>;
    const emailRaw = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const displayName = body.displayName != null ? String(body.displayName).trim().slice(0, 120) : null;

    if (!isValidEmail(emailRaw)) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    if (password.length > 128) {
      return res.status(400).json({ error: "Password is too long" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.siteUser.create({
      data: {
        email: emailRaw,
        passwordHash,
        displayName: displayName || null,
      },
      select: { id: true, email: true, displayName: true },
    });

    const token = jwt.sign({ sub: user.id, email: user.email }, authSecret(), { expiresIn: `${TOKEN_DAYS}d` });
    res.cookie(COOKIE_NAME, token, cookieOpts());
    return res.status(201).json({ user });
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2002") {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    return next(e instanceof Error ? e : new Error(String(e)));
  }
}

function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/", httpOnly: true, sameSite: "lax" });
  res.clearCookie(COOKIE_NAME, { path: "/", httpOnly: true, sameSite: "none", secure: true });
}

export async function loginSiteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as Record<string, unknown>;
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const row = await prisma.siteUser.findUnique({ where: { email } });
    if (!row) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const ok = await bcrypt.compare(password, row.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = { id: row.id, email: row.email, displayName: row.displayName };
    const token = jwt.sign({ sub: user.id, email: user.email }, authSecret(), { expiresIn: `${TOKEN_DAYS}d` });
    res.cookie(COOKIE_NAME, token, cookieOpts());
    return res.json({ user });
  } catch (e) {
    return next(e instanceof Error ? e : new Error(String(e)));
  }
}

export function logoutSiteUser(_req: Request, res: Response) {
  clearSessionCookie(res);
  return res.json({ ok: true });
}

export async function meSiteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = req.cookies?.[COOKIE_NAME];
    if (!raw || typeof raw !== "string") {
      return res.json({ user: null });
    }
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(raw, authSecret()) as jwt.JwtPayload;
    } catch {
      clearSessionCookie(res);
      return res.json({ user: null });
    }
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    if (!sub) {
      clearSessionCookie(res);
      return res.json({ user: null });
    }
    const row = await prisma.siteUser.findUnique({
      where: { id: sub },
      select: { id: true, email: true, displayName: true },
    });
    if (!row) {
      clearSessionCookie(res);
      return res.json({ user: null });
    }
    return res.json({ user: row });
  } catch (e) {
    return next(e instanceof Error ? e : new Error(String(e)));
  }
}
