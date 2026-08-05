import React from "react";
import { useNavigate } from "react-router-dom";
import { Clock, LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLang } from "../../contexts/LangContext";
import { useTheme } from "../../contexts/ThemeContext";
import { OS_T } from "../i18n";
import { tokens } from "../theme";
import { osApi } from "../api";

const EXTRA = {
  ar: {
    title: "بانتظار موافقة الإدارة",
    subtitle: "تم إنشاء حسابك بنجاح، وحاليًا في انتظار موافقة الإدارة لمنحك الصلاحيات.",
    detail: "لن تستطيع الوصول لأي وحدة داخل النظام حتى يقوم المدير بتفعيل حسابك واختيار الرتبة المناسبة لك.",
    refresh: "تحقق من الحالة",
    logout: "خروج",
    account: "الحساب",
  },
  en: {
    title: "Awaiting management approval",
    subtitle: "Your account was created and is now waiting for a manager to grant permissions.",
    detail: "You cannot access any module inside the system until a manager activates your account and assigns your role.",
    refresh: "Check status",
    logout: "Log out",
    account: "Account",
  },
};

export default function OSPending() {
  const { user, logout, setUser, loading } = useAuth();
  const { lang } = useLang();
  const { theme } = useTheme();
  const t = OS_T[lang];
  const e = EXTRA[lang];
  const k = tokens(theme);
  const navigate = useNavigate();

  const refresh = async () => {
    try {
      const r = await osApi.get("/me");
      setUser({ ...user, ...r.data });
      if (r.data.permissions_effective && r.data.permissions_effective.length > 0) {
        navigate("/os", { replace: true });
      }
    } catch (err) { /* ignore */ }
  };

  if (loading) return <div className={`min-h-screen ${k.shellBg} ${k.shellText}`}>…</div>;

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className={`${k.shellBg} ${k.shellText} min-h-screen flex items-center justify-center px-6`} data-testid="os-pending">
      <div className={`w-full max-w-lg ${k.cardBg} border ${k.cardBorder} rounded-2xl p-10 text-center`}>
        <div className={`w-16 h-16 rounded-2xl ${k.accentSoft} flex items-center justify-center mx-auto mb-5`}>
          <Clock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">{e.title}</h1>
        <p className={`text-sm mb-1 ${k.subtle}`}>{e.subtitle}</p>
        <p className={`text-xs mt-3 ${k.muted}`}>{e.detail}</p>

        {user && (
          <div className={`mt-6 border ${k.cardBorder} rounded-md p-4 text-start`}>
            <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${k.muted} mb-2`}>{e.account}</p>
            <p className="text-sm">{user.name}</p>
            <p className={`text-xs ${k.muted}`}>{user.email} · {user.role}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 mt-6">
          <button onClick={refresh} data-testid="pending-refresh"
            className={`flex-1 inline-flex items-center justify-center gap-2 ${k.primary} rounded-md py-2.5 text-sm font-medium transition-colors duration-200`}>
            <RefreshCw className="w-4 h-4" /> {e.refresh}
          </button>
          <button onClick={() => { logout(); navigate("/os/login", { replace: true }); }}
            data-testid="pending-logout"
            className={`flex-1 inline-flex items-center justify-center gap-2 border ${k.ghost} rounded-md py-2.5 text-sm transition-colors duration-200`}>
            <LogOut className="w-4 h-4" /> {e.logout}
          </button>
        </div>
      </div>
    </div>
  );
}
