import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

// ── Supabase Realtime (production) ───────────────────────────────────────────
// When VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set (i.e. on Vercel),
// we use Supabase's built-in WebSocket realtime instead of custom SSE.
// In local dev those vars are absent so we fall back to the SSE endpoint.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // ── Strategy 1: Supabase Realtime (Vercel / production) ──────────────────
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      let supabase = null;
      let channel = null;

      // BUG 7 FIX: Hoist the supabase client so cleanup can call removeChannel
      // on the SAME instance that created the channel. Previously, cleanup created
      // a new client which meant removeChannel was a no-op, causing WebSocket leaks.
      import("@supabase/supabase-js").then(({ createClient }) => {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        channel = supabase
          .channel("vigor-realtime")
          .on(
            "postgres_changes",
            { event: "*", schema: "public" },
            (payload) => {
              console.log("Supabase Realtime change:", payload);
              window.dispatchEvent(
                new CustomEvent("db-change", { detail: payload })
              );
            }
          )
          .subscribe((status) => {
            console.log("Supabase Realtime status:", status);
          });
      });

      return () => {
        // Use the same `supabase` instance created above — not a new one
        if (supabase && channel) {
          supabase.removeChannel(channel).catch((err) => {
            console.warn("Failed to remove Supabase realtime channel:", err);
          });
        }
      };
    }

    // ── Strategy 2: SSE fallback (local development) ─────────────────────────
    const token = localStorage.getItem("vigor_token");
    if (!token) return;

    let eventSource = null;
    let reconnectTimer = null;
    let closed = false;

    function connect() {
      if (closed) return;
      eventSource = new EventSource(`/api/realtime?token=${token}`);

      eventSource.onmessage = (event) => {
        try {
          const change = JSON.parse(event.data);
          console.log("Realtime change received:", change);
          window.dispatchEvent(new CustomEvent("db-change", { detail: change }));
        } catch (err) {
          console.error("Failed to parse realtime data:", err);
        }
      };

      eventSource.onerror = () => {
        // SSE connection dropped — close current source and reconnect after 5 seconds
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!closed) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      };
    }

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSource) eventSource.close();
    };
  }, []);

  return (
    <div className="flex h-screen bg-ink-50 dark:bg-ink-900 text-ink-800 dark:text-ink-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
