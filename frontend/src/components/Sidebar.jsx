import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Target,
  Building2,
  Users2,
  Megaphone,
  CalendarDays,
  Truck,
  CheckSquare,
  Wallet,
  BarChart3,
  Settings,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../context/PermissionsContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
  { to: "/leads", label: "Leads", icon: Target, page: "leads" },
  { to: "/clients", label: "Clients", icon: Building2, page: "clients" },
  { to: "/influencers", label: "Influencers", icon: Sparkles, page: "influencers" },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone, page: "campaigns" },
  { to: "/events", label: "Events", icon: CalendarDays, page: "events" },
  { to: "/vendors", label: "Vendors", icon: Truck, page: "vendors" },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, page: "tasks" },
  { to: "/finance", label: "Finance", icon: Wallet, page: "finance" },
  { to: "/reports", label: "Reports", icon: BarChart3, page: "reports" },
  { to: "/vigor-space", label: "Vigor Space", icon: GraduationCap, page: "vigor-space" },
  { to: "/settings", label: "Settings", icon: Settings, page: "settings" },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const { canAccessPage } = usePermissions();
  const items = NAV.filter((item) => !user || canAccessPage(item.page));

  return (
    <>
      {open && <div className="fixed inset-0 bg-ink-900/40 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed lg:static z-40 inset-y-0 left-0 w-64 bg-ink-900 text-white flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-center px-4 h-16 border-b border-white/10">
          <div className="bg-white rounded-lg px-3 py-1.5 flex items-center justify-center w-full">
            <img src="/logo.png" alt="Vigor Launchpad" className="h-9 object-contain" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-600 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
              end={item.to === "/"}
            >
              <item.icon size={17} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10 text-[11px] text-white/40">
          Vigor Launchpad &copy; {new Date().getFullYear()}
        </div>
      </aside>
    </>
  );
}
