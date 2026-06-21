import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("vigor_token");
    if (!token) return;

    const eventSource = new EventSource(`/api/realtime?token=${token}`);

    eventSource.onmessage = (event) => {
      try {
        const change = JSON.parse(event.data);
        console.log("Realtime change received:", change);
        window.dispatchEvent(new CustomEvent("db-change", { detail: change }));
      } catch (err) {
        console.error("Failed to parse realtime data:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("Realtime EventSource error, will retry...", err);
    };

    return () => {
      eventSource.close();
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
