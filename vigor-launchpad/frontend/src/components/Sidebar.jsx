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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["Super Admin", "Manager", "Employee", "Finance"] },
  { to: "/leads", label: "Leads", icon: Target, roles: ["Super Admin", "Manager", "Employee"] },
  { to: "/clients", label: "Clients", icon: Building2, roles: ["Super Admin", "Manager", "Employee", "Finance"] },
  { to: "/influencers", label: "Influencers", icon: Sparkles, roles: ["Super Admin", "Manager", "Employee"] },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone, roles: ["Super Admin", "Manager", "Employee"] },
  { to: "/events", label: "Events", icon: CalendarDays, roles: ["Super Admin", "Manager", "Employee"] },
  { to: "/vendors", label: "Vendors", icon: Truck, roles: ["Super Admin", "Manager", "Finance"] },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, roles: ["Super Admin", "Manager", "Employee"] },
  { to: "/finance", label: "Finance", icon: Wallet, roles: ["Super Admin", "Finance", "Manager"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["Super Admin", "Manager", "Finance"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["Super Admin"] },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const items = NAV.filter((item) => !user || item.roles.includes(user.role));

  return (
    <>
      {open && <div className="fixed inset-0 bg-ink-900/40 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed lg:static z-40 inset-y-0 left-0 w-64 bg-ink-900 text-white flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center font-display font-bold text-sm">
            VL
          </div>
          <div className="leading-tight">
            <p className="font-display font-bold text-sm">Vigor Launchpad</p>
            <p className="text-[11px] text-white/50">Operations Platform</p>
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
