import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm text-[var(--card-heading)] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await register(email.trim(), password, displayName.trim() || undefined);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <div className="site-card p-8">
          <h1 className="font-display text-xl font-semibold text-[var(--card-heading)]">Create account</h1>
          <p className="mt-2 text-sm text-[var(--card-muted)]">
            Register for site updates and hub features. Not connected to your wallet private keys.
          </p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="reg-email" className="block text-xs font-medium text-[var(--card-muted)]">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="reg-name" className="block text-xs font-medium text-[var(--card-muted)]">
                Display name <span className="font-normal">(optional)</span>
              </label>
              <input
                id="reg-name"
                type="text"
                autoComplete="nickname"
                maxLength={120}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-xs font-medium text-[var(--card-muted)]">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="reg-confirm" className="block text-xs font-medium text-[var(--card-muted)]">
                Confirm password
              </label>
              <input
                id="reg-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-[var(--card-muted)]">
            Already registered?{" "}
            <Link to="/login" className="font-medium text-brand-600 hover:underline">
              Sign in
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
