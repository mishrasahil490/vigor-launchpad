import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, KeyRound, CheckCircle, XCircle } from "lucide-react";
import api from "../api/client";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | ready | success | error | invalid
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [accessToken, setAccessToken] = useState(null);

  // Supabase password reset emails redirect to our app with the token in the URL hash.
  // Format: /reset-password#access_token=xxx&type=recovery&...
  useEffect(() => {
    const hash = window.location.hash;
    // Parse the fragment — URLSearchParams needs '?' prefix or we strip the '#'
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const type = params.get("type");
    const token = params.get("access_token");

    if (type === "recovery" && token) {
      setAccessToken(token);
      setStatus("ready");
      // Clean the token from the URL bar for security (no reload)
      window.history.replaceState(null, "", window.location.pathname);
    } else {
      setStatus("invalid");
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (newPassword.length < 6) {
      return setError("Password must be at least 6 characters.");
    }

    setStatus("submitting");
    try {
      await api.post("/auth/reset-password-confirm", {
        accessToken,
        newPassword,
      });
      setStatus("success");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password. The link may have expired.");
      setStatus("ready");
    }
  }

  return (
    <div className="min-h-screen flex bg-ink-50 dark:bg-ink-900">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-1/2 bg-ink-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent-coral/20 blur-3xl" />
        <div />
        <div className="relative z-10 max-w-md space-y-8">
          <div className="bg-white rounded-lg px-4 py-2.5 flex items-center justify-center w-64 shadow-sm mx-auto translate-x-3">
            <img src="/logo.png" alt="Vigor Launchpad" className="h-12 object-contain" />
          </div>
          <div>
            <h1 className="font-display text-4xl font-bold leading-tight mb-4">
              Secure your account with a new password.
            </h1>
            <p className="text-white/60">
              Choose a strong password you haven't used before to keep your Vigor Launchpad account safe.
            </p>
          </div>
        </div>
        <div className="relative z-10 text-xs text-white/40">
          Vigor Launchpad &copy; {new Date().getFullYear()}
        </div>
      </div>

      {/* Right content panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Verifying token spinner */}
          {status === "loading" && (
            <div className="text-center py-10">
              <Loader2 size={30} className="animate-spin text-brand-600 mx-auto mb-3" />
              <p className="text-sm text-ink-500 dark:text-ink-300">Verifying reset link…</p>
            </div>
          )}

          {/* Invalid / expired link */}
          {status === "invalid" && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-900/20 mb-4">
                <XCircle size={26} className="text-rose-500" />
              </div>
              <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-white mb-2">
                Invalid or expired link
              </h2>
              <p className="text-sm text-ink-500 dark:text-ink-300 mb-6 leading-relaxed">
                This password reset link is invalid or has already been used. Please request a new one from the login page.
              </p>
              <button onClick={() => navigate("/login")} className="btn-primary w-full justify-center">
                Back to Login
              </button>
            </div>
          )}

          {/* New password form */}
          {(status === "ready" || status === "submitting") && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/20 shrink-0">
                  <KeyRound size={18} className="text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Set new password</h2>
                  <p className="text-xs text-ink-400 dark:text-ink-400">Enter a strong new password for your account.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">New Password</label>
                  <input
                    id="reset-new-password"
                    className="input"
                    type="password"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                    autoComplete="new-password"
                    disabled={status === "submitting"}
                  />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    id="reset-confirm-password"
                    className="input"
                    type="password"
                    placeholder="Repeat your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={status === "submitting"}
                  />
                </div>

                {error && (
                  <p className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}

                <button
                  id="reset-submit"
                  type="submit"
                  disabled={status === "submitting"}
                  className="btn-primary w-full justify-center"
                >
                  {status === "submitting" && <Loader2 size={16} className="animate-spin" />}
                  Update Password
                </button>
              </form>
            </>
          )}

          {/* Success state */}
          {status === "success" && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/20 mb-4">
                <CheckCircle size={26} className="text-emerald-500" />
              </div>
              <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-white mb-2">
                Password updated!
              </h2>
              <p className="text-sm text-ink-500 dark:text-ink-300 mb-6 leading-relaxed">
                Your password has been changed successfully. Please sign in with your new password.
              </p>
              <button onClick={() => navigate("/login")} className="btn-primary w-full justify-center">
                Sign in
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
