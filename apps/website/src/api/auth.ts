import { site } from "../config";

export type SiteUser = { id: string; email: string; displayName: string | null };

async function parseJson<T>(r: Response): Promise<T> {
  return r.json() as Promise<T>;
}

export async function fetchMe(): Promise<SiteUser | null> {
  const r = await fetch(`${site.apiUrl}/api/v1/auth/me`, { credentials: "include" });
  if (!r.ok) return null;
  try {
    const j = await parseJson<{ user: SiteUser | null }>(r);
    return j.user ?? null;
  } catch {
    return null;
  }
}

export async function loginRequest(email: string, password: string): Promise<SiteUser> {
  const r = await fetch(`${site.apiUrl}/api/v1/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await parseJson<{ user?: SiteUser; error?: string }>(r);
  if (!r.ok) throw new Error(j.error || "Login failed");
  if (!j.user) throw new Error("Login failed");
  return j.user;
}

export async function registerRequest(
  email: string,
  password: string,
  displayName?: string,
): Promise<SiteUser> {
  const r = await fetch(`${site.apiUrl}/api/v1/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName: displayName || undefined }),
  });
  const j = await parseJson<{ user?: SiteUser; error?: string }>(r);
  if (!r.ok) throw new Error(j.error || "Registration failed");
  if (!j.user) throw new Error("Registration failed");
  return j.user;
}

export async function logoutRequest(): Promise<void> {
  await fetch(`${site.apiUrl}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
