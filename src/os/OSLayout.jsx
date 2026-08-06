import React, { useMemo, useState, useEffect, useCallback } from "react";
import { NavLink, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ShoppingBag, Users, Package, Megaphone, LifeBuoy,
  UserCog, BarChart3, ScrollText, Settings, LogOut, Sun, Moon, Globe,
  Bell, Menu, ShieldCheck, ExternalLink, Briefcase, Share2, MessageSquare,
  CalendarDays, CheckSquare, FolderKanban, UserPlus, Search, Mail,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { OS_T } from "./i18n";
import { tokens } from "./theme";
import { osApi } from "./api";
import GlobalSearchBar from "./GlobalSearchBar";

const NAV = [
  { to: "/os", end: true, key: "dashboard", Icon: LayoutDashboard, perm: "dashboard.view" },
  { to: "/os/orders", key: "orders", Icon: ShoppingBag, perm: "orders.view" },
  { to: "/os/customers", key: "customers", Icon: Users, perm: "customers.view" },
  { to: "/os/products", key: "products", Icon: Package, perm: "products.view" },
  { to: "/os/marketing", key: "marketing", Icon: Megaphone, perm: "marketing.view" },
  { to: "/os/social", key: "social", Icon: Share2, perm: "social.view" },
  { to: "/os/support", key: "support", Icon: LifeBuoy, perm: "support.view" },
  { to: "/os/hr", key: "hr", Icon: Briefcase, perm: "hr.view" },
  { to: "/os/applications", key: "applications", Icon: UserPlus, perm: "applications.view" },
  { to: "/os/employees", key: "employees", Icon: UserCog, perm: "employees.view" },
  { to: "/os/tasks", key: "tasks", Icon: CheckSquare, perm: "tasks.view" },
  { to: "/os/calendar", key: "calendar", Icon: CalendarDays, perm: "calendar.view" },
  { to: "/os/chat", key: "chat", Icon: MessageSquare, perm: "chat.view" },
  { to: "/os/mail", key: "mail", Icon: Mail, perm: "support.view" },
  { to: "/os/files", key: "files", Icon: FolderKanban, perm: "files.view" },
  { to: "/os/notifications", key: "notifications", Icon: Bell, perm: "notifications.view" },
  { to: "/os/analytics", key: "analytics", Icon: BarChart3, perm: "analytics.view" },
  { to: "/os/logs", key: "logs", Icon: ScrollText, perm: "logs.view" },
  { to: "/os/settings", key: "settings", Icon: Settings, perm: "settings.view" },
];

export default function OSLayout() {
  const { user, loading, logout, setUser } = useAuth();
  const { lang, set: setLang } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();
  const t = OS_T[lang];
  const k = tokens(theme);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const perms = user?.permissions_effective || [];

  // Fetch full user (with permissions_effective) and refresh in real-time
  const refreshMe = useCallback(async () => {
    try {
      const r = await osApi.get("/me");
      setUser((prev) => ({ ...prev, ...r.data }));
    } catch (e) { /* ignore */ }
  }, [setUser]);

  const outletContext = useMemo(() => ({ user, t, lang, theme, k, perms, refreshMe }),
    [user, t, lang, theme, k, perms, refreshMe]);

  useEffect(() => {
    if (user?.language && user.language !== lang) setLang(user.language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.language]);

  useEffect(() => {
    if (user && !user.permissions_effective) refreshMe();
  }, [user, refreshMe]);

  // Poll /me every 10s so permission/role changes reflect instantly (max 10s delay)
  useEffect(() => {
    if (!user) return;
    const int = setInterval(refreshMe, 10000);
    return () => clearInterval(int);
  }, [user, refreshMe]);

  // Heartbeat every 45s to keep user online
  useEffect(() => {
    if (!user) return;
    const beat = async () => {
      if (document.visibilityState !== "visible") return;
      try { await osApi.post("/heartbeat"); } catch {}
      try { await osApi.get("/online-scan"); } catch {}
    };
    beat();
    const iv = setInterval(beat, 45000);
    const onVis = () => document.visibilityState === "visible" && beat();
    document.addEventListener("visibilitychange", onVis);
    const onUnload = () => {
      const token = localStorage.getItem("ur_admin_token");
      if (!token) return;
      try {
        navigator.sendBeacon?.(
          `${process.env.REACT_APP_BACKEND_URL}/api/os/logout`,
          new Blob([JSON.stringify({})], { type: "application/json" })
        );
      } catch {}
    };
    window.addEventListener("beforeunload", onUnload);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("beforeunload", onUnload); };
  }, [user]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  if (loading) return <div className={`min-h-screen ${k.shellBg} ${k.shellText} flex items-center justify-center`}>…</div>;
  if (!user) return <Navigate to="/os/login" replace />;

  // Auto-redirect pending users (zero permissions) to /os/pending
  if (user.permissions_effective && user.permissions_effective.length === 0 && location.pathname !== "/os/pending") {
    return <Navigate to="/os/pending" replace />;
  }

  const items = NAV.filter((n) => perms.includes(n.perm));

  const persistPref = async (patch) => {
    try {
      const { data } = await osApi.patch("/preferences", patch);
      setUser({ ...user, ...data });
    } catch (e) { /* ignore */ }
  };

  const onLangChange = () => {
    const next = lang === "ar" ? "en" : "ar";
    setLang(next);
    persistPref({ language: next });
  };
  const onThemeChange = () => {
    toggleTheme();
    persistPref({ theme: theme === "dark" ? "light" : "dark" });
  };

  const Sidebar = (
    <div className={`w-64 shrink-0 border-e ${k.sideBorder} ${k.sideBg} flex flex-col`}>
      <div className={`px-6 py-5 border-b ${k.sideBorder} flex items-center gap-3`}>
        <div className={`w-9 h-9 rounded-lg ${k.logoBg} flex items-center justify-center`}>
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold tracking-tight">UR SETUP OS</p>
          <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${k.muted}`}>{t.tagline}</p>
        </div>
      </div>
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end}
            data-testid={`os-nav-${it.key}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors duration-200 ${
                isActive ? `${k.accentSoft} border-s-2 ${k.dark ? "border-white" : "border-black"}` : `${k.muted} ${k.hover}`
              }`
            }>
            <it.Icon className="w-4 h-4" />
            <span>{t.nav[it.key]}</span>
          </NavLink>
        ))}
        <a href="/" target="_blank" rel="noreferrer"
          className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-md ${k.muted} ${k.hover} transition-colors duration-200`}>
          <ExternalLink className="w-4 h-4" /><span>{t.nav.store}</span>
        </a>
      </nav>
      <div className={`px-4 py-4 border-t ${k.sideBorder}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full ${k.logoBg} flex items-center justify-center font-semibold text-sm`}>
            {(user.name || user.email).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm truncate">{user.name}</p>
            <p className={`text-xs ${k.muted}`}>{user.role}</p>
          </div>
        </div>
        <button onClick={() => { logout(); navigate("/os/login", { replace: true }); }}
          data-testid="os-logout"
          className={`mt-3 w-full inline-flex items-center gap-2 justify-center border ${k.ghost} py-2 text-xs uppercase tracking-widest rounded-md transition-colors duration-200`}>
          <LogOut className="w-3.5 h-3.5" /> {t.nav.logout}
        </button>
      </div>
    </div>
  );

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className={`${k.shellBg} ${k.shellText} min-h-screen flex`} data-testid="os-shell">
      <aside className="hidden lg:flex">{Sidebar}</aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="absolute inset-y-0 start-0 flex" onClick={(e) => e.stopPropagation()}>{Sidebar}</div>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        <header className={`sticky top-0 z-30 border-b ${k.barBg} backdrop-blur px-4 lg:px-8 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMobileOpen(true)} data-testid="os-mobile-menu">
              <Menu className="w-5 h-5" />
            </button>
            <p className="text-sm font-medium">{t.app_name}</p>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-md mx-4">
            <GlobalSearchBar k={k} lang={lang} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onLangChange} data-testid="os-lang-toggle"
              className={`inline-flex items-center gap-1.5 border ${k.ghost} px-2.5 py-1.5 text-xs rounded-md transition-colors duration-200`}>
              <Globe className="w-3.5 h-3.5" /> {lang === "ar" ? "EN" : "AR"}
            </button>
            <button onClick={onThemeChange} data-testid="os-theme-toggle"
              className={`inline-flex items-center border ${k.ghost} p-1.5 rounded-md transition-colors duration-200`}>
              {k.dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => navigate("/os/notifications")} className={`inline-flex items-center border ${k.ghost} p-1.5 rounded-md transition-colors duration-200`}
              data-testid="os-notif-btn">
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </header>
        <div className="p-4 lg:p-8 flex-1 min-w-0">
          <Outlet context={outletContext} />
        </div>
      </main>
    </div>
  );
}
