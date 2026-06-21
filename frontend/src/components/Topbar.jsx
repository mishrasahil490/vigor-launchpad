import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, Bell, Sun, Moon, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../api/client";

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    api.get("/notifications").then((res) => setNotifications(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    function onClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (userRef.current && !userRef.current.contains(e.target)) setShowUserMenu(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.get(`/search?q=${encodeURIComponent(query)}`).then((res) => setResults(res.data.data || []));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    await api.put("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <header className="h-16 flex items-center gap-4 px-4 lg:px-6 border-b border-ink-100 dark:border-ink-700 bg-white/80 dark:bg-ink-800/80 backdrop-blur sticky top-0 z-20">
      <button className="lg:hidden text-ink-500" onClick={onMenuClick}>
        <Menu size={22} />
      </button>

      <div className="relative flex-1 max-w-md" ref={searchRef}>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          className="input pl-9"
          placeholder="Search leads, clients, influencers, campaigns..."
          value={query}
          onFocus={() => setShowResults(true)}
          onChange={(e) => setQuery(e.target.value)}
        />
        {showResults && results.length > 0 && (
          <div className="absolute mt-1 w-full card max-h-80 overflow-y-auto z-30">
            {results.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => {
                  setShowResults(false);
                  setQuery("");
                  navigate(r.route);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-ink-50 dark:hover:bg-ink-700 flex items-center justify-between gap-2 border-b border-ink-50 dark:border-ink-700 last:border-0"
              >
                <span>
                  <span className="block text-sm font-medium text-ink-800 dark:text-white">{r.title}</span>
                  <span className="block text-xs text-ink-400">{r.subtitle}</span>
                </span>
                <span className="badge bg-ink-100 text-ink-500 dark:bg-ink-700 dark:text-ink-200">{r.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button onClick={toggleTheme} className="btn-ghost !px-2">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative" ref={notifRef}>
          <button onClick={() => setShowNotifications((s) => !s)} className="btn-ghost !px-2 relative">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-accent-coral text-white text-[10px] flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 card max-h-96 overflow-y-auto z-30">
              <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100 dark:border-ink-700">
                <span className="font-semibold text-sm text-ink-800 dark:text-white">Notifications</span>
                <button onClick={markAllRead} className="text-xs text-brand-600 font-medium hover:underline">
                  Mark all read
                </button>
              </div>
              {notifications.length === 0 && <p className="px-4 py-6 text-sm text-ink-400 text-center">You're all caught up.</p>}
              {notifications.map((n) => (
                <div key={n.id} className={`px-4 py-3 border-b border-ink-50 dark:border-ink-700 last:border-0 ${!n.read ? "bg-brand-50/40 dark:bg-brand-500/5" : ""}`}>
                  <p className="text-xs font-semibold text-brand-600 mb-0.5">{n.type}</p>
                  <p className="text-sm text-ink-700 dark:text-ink-100">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={userRef}>
          <button onClick={() => setShowUserMenu((s) => !s)} className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700">
            <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 flex items-center justify-center font-semibold text-sm">
              {user?.name?.[0] || "U"}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-ink-800 dark:text-white leading-tight">{user?.name}</p>
              <p className="text-xs text-ink-400 leading-tight">{user?.role}</p>
            </div>
            <ChevronDown size={14} className="text-ink-400 hidden sm:block" />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 card z-30 overflow-hidden">
              <div className="px-4 py-3 border-b border-ink-100 dark:border-ink-700">
                <p className="text-sm font-semibold text-ink-800 dark:text-white">{user?.name}</p>
                <p className="text-xs text-ink-400">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
