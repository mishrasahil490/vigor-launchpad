import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

const DEMO_ACCOUNTS = [
  { role: "Super Admin", email: "admin@vigorlaunchpad.com", password: "Admin@123" },
  { role: "Manager", email: "priya.manager@vigorlaunchpad.com", password: "Manager@123" },
  { role: "Employee", email: "sneha.employee@vigorlaunchpad.com", password: "Employee@123" },
  { role: "Finance", email: "neha.finance@vigorlaunchpad.com", password: "Finance@123" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@vigorlaunchpad.com");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen flex bg-ink-50 dark:bg-ink-900">
      <div className="hidden lg:flex w-1/2 bg-ink-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent-coral/20 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center font-display font-bold">VL</div>
            <p className="font-display font-bold text-lg">Vigor Launchpad</p>
          </div>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight mb-4">
            Run every brand, creator, and event from one command center.
          </h1>
          <p className="text-white/60">
            Leads, clients, influencer relationships, campaigns, events, and finance — unified in a single
            operations platform built for influencer marketing teams.
          </p>
        </div>
        <div className="relative z-10 text-xs text-white/40">Vigor Launchpad &copy; {new Date().getFullYear()}</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center font-display font-bold text-white">VL</div>
            <p className="font-display font-bold text-lg text-ink-900 dark:text-white">Vigor Launchpad</p>
          </div>

          <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-white mb-1">Welcome back</h2>
          <p className="text-sm text-ink-500 dark:text-ink-300 mb-6">Sign in to your operations dashboard.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Sign in
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-ink-100 dark:border-ink-700">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-2">Quick demo access</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.password);
                  }}
                  className="btn-secondary !py-1.5 !text-xs justify-center"
                >
                  {acc.role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
