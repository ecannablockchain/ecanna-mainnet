import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm text-[var(--card-heading)] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <div className="site-card p-8">
          <h1 className="font-display text-xl font-semibold text-[var(--card-heading)]">Sign in</h1>
          <p className="mt-2 text-sm text-[var(--card-muted)]">
            Site account for updates and hub features. This is separate from your on-chain wallet.
          </p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-[var(--card-muted)]">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-[var(--card-muted)]">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-[var(--card-muted)]">
            No account?{" "}
            <Link to="/register" className="font-medium text-brand-600 hover:underline">
              Register
            </Link>
          </p>
          <p className="mt-4 text-center">
            <Link to="/" className="text-xs text-[var(--card-muted)] hover:text-brand-600">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
