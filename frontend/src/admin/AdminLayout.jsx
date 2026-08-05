import React, { useMemo } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard, MessageSquare, Rocket, Megaphone, Mail, Users, Shield } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const NAV = [
  { to: "/admin", end: true, label: "Overview", icon: LayoutDashboard, roles: ["super_admin", "admin", "moderator"] },
  { to: "/admin/reviews", label: "Reviews", icon: MessageSquare, roles: ["super_admin", "admin", "moderator"] },
  { to: "/admin/coming-soon", label: "Coming Soon", icon: Rocket, roles: ["super_admin", "admin"] },
  { to: "/admin/promo", label: "Promo Banner", icon: Megaphone, roles: ["super_admin", "admin"] },
  { to: "/admin/newsletter", label: "Newsletter", icon: Mail, roles: ["super_admin", "admin"] },
  { to: "/admin/users", label: "Users", icon: Users, roles: ["super_admin"] },
];

export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const outletContext = useMemo(() => ({ user }), [user]);

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;

  const items = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <div dir="ltr" className="min-h-screen bg-[#0A0A0A] text-white flex" data-testid="admin-layout">
      <aside className="hidden md:flex md:w-64 flex-col border-e border-white/10 bg-[#0d0d0d]">
        <div className="px-6 py-6 border-b border-white/10">
          <p className="font-display font-extrabold tracking-[0.22em] text-lg">UR SETUP</p>
          <p className="kicker mt-1">STUDIO CONSOLE</p>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              data-testid={`admin-nav-${it.label.toLowerCase().replace(/ /g, "-")}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors duration-300 ${
                  isActive ? "bg-white text-black" : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <it.icon className="w-4 h-4" />
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-5 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-semibold">
              {(user.name || user.email).slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm truncate">{user.name}</p>
              <p className="text-xs text-neutral-500 flex items-center gap-1">
                <Shield className="w-3 h-3" /> {user.role}
              </p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate("/admin/login", { replace: true }); }}
            data-testid="admin-logout"
            className="mt-4 w-full inline-flex items-center gap-2 justify-center border border-white/15 py-2 text-xs tracking-[0.18em] uppercase hover:bg-white hover:text-black transition-colors duration-300"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="font-display font-extrabold tracking-[0.2em]">UR SETUP · ADMIN</p>
          <button
            onClick={() => { logout(); navigate("/admin/login", { replace: true }); }}
            className="text-xs uppercase tracking-widest border border-white/15 px-3 py-1.5"
          >
            Logout
          </button>
        </div>
        {/* Mobile nav pills */}
        <div className="md:hidden flex overflow-x-auto gap-2 px-4 py-3 border-b border-white/10 bg-[#0d0d0d]">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `shrink-0 px-3 py-1.5 text-xs uppercase tracking-widest rounded-full border ${
                  isActive ? "bg-white text-black border-white" : "border-white/20 text-neutral-400"
                }`
              }
            >
              {it.label}
            </NavLink>
          ))}
        </div>
        <div className="p-6 lg:p-10">
          <Outlet context={outletContext} />
        </div>
      </main>
    </div>
  );
}
