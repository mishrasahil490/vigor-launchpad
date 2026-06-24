import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2, ArrowLeft, MailCheck } from "lucide-react";
import api from "../api/client";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setForgotError("");
    setForgotMessage("");
    setForgotLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email: forgotEmail });
      setForgotMessage(res.data.message);
      setForgotSent(true);
    } catch (err) {
      setForgotError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  function resetForgot() {
    setShowForgot(false);
    setForgotEmail("");
    setForgotMessage("");
    setForgotError("");
    setForgotSent(false);
  }

  return (
    <div className="min-h-screen flex bg-ink-50 dark:bg-ink-900">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-1/2 bg-ink-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent-coral/20 blur-3xl" />

        {/* Empty top slot to push content down */}
        <div />

        <div className="relative z-10 max-w-md space-y-8">
          <div className="bg-white rounded-lg px-4 py-2.5 flex items-center justify-center w-64 shadow-sm mx-auto translate-x-3">
            <img src="/logo.png" alt="Vigor Launchpad" className="h-12 object-contain" />
          </div>
          <div>
            <h1 className="font-display text-4xl font-bold leading-tight mb-4">
              Run every brand, creator, and event from one command center.
            </h1>
            <p className="text-white/60">
              Leads, clients, influencer relationships, campaigns, events, and finance — unified in a single
              operations platform built for influencer marketing teams.
            </p>
          </div>
        </div>
        <div className="relative z-10 text-xs text-white/40">Vigor Launchpad &copy; {new Date().getFullYear()}</div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {!showForgot ? (
            <>
              <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-white mb-1">Welcome back</h2>
              <p className="text-sm text-ink-500 dark:text-ink-300 mb-6">Sign in to your operations dashboard.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    id="login-email"
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label !mb-0">Password</label>
                    <button
                      type="button"
                      onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="login-password"
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 rounded-lg">{error}</p>
                )}
                <button id="login-submit" type="submit" disabled={loading} className="btn-primary w-full justify-center">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Sign in
                </button>
              </form>
            </>
          ) : (
            /* ── Forgot Password Panel ── */
            <>
              <button
                type="button"
                onClick={resetForgot}
                className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 dark:hover:text-white mb-6 transition-colors"
              >
                <ArrowLeft size={15} />
                Back to sign in
              </button>

              {!forgotSent ? (
                <>
                  <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-white mb-1">Reset your password</h2>
                  <p className="text-sm text-ink-500 dark:text-ink-300 mb-6">
                    Enter your account email and we'll send you a password reset link.
                  </p>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="label">Email</label>
                      <input
                        id="forgot-email"
                        className="input"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        autoFocus
                      />
                    </div>
                    {forgotError && (
                      <p className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 rounded-lg">{forgotError}</p>
                    )}
                    <button
                      id="forgot-submit"
                      type="submit"
                      disabled={forgotLoading}
                      className="btn-primary w-full justify-center"
                    >
                      {forgotLoading && <Loader2 size={16} className="animate-spin" />}
                      Send reset link
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-900/20 mb-4">
                    <MailCheck size={26} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white mb-2">Check your inbox</h2>
                  <p className="text-sm text-ink-500 dark:text-ink-300 mb-6 leading-relaxed">{forgotMessage}</p>
                  <button
                    type="button"
                    onClick={resetForgot}
                    className="btn-secondary w-full justify-center"
                  >
                    Back to sign in
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
