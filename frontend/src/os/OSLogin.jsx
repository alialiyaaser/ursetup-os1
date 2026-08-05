import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { LogIn, KeyRound, Mail, Shield, Globe, Sun, Moon } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { OS_T } from "./i18n";
import { tokens } from "./theme";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function googleLogin() {
  const redirectUrl = window.location.origin + "/os";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export default function OSLogin() {
  const { user, login, loading } = useAuth();
  const { lang, set: setLang } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();
  const t = OS_T[lang];
  const k = tokens(theme);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <div className={`min-h-screen ${k.shellBg} ${k.shellText} flex items-center justify-center`}>…</div>;
  if (user) return <Navigate to="/os" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email.trim(), password);
      toast.success(t.common.welcome_back);
      navigate("/os", { replace: true });
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : t.login.invalid);
    } finally { setBusy(false); }
  };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className={`${k.shellBg} ${k.shellText} min-h-screen`}>
      <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
        {/* Ambient marble grain background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.35]" style={{
          backgroundImage: k.dark
            ? "radial-gradient(600px 380px at 15% 5%, rgba(255,255,255,0.05), transparent 60%), radial-gradient(500px 320px at 90% 90%, rgba(255,255,255,0.03), transparent 60%)"
            : "radial-gradient(600px 380px at 15% 5%, rgba(0,0,0,0.05), transparent 60%), radial-gradient(500px 320px at 90% 90%, rgba(0,0,0,0.03), transparent 60%)"
        }} />

        <div className="absolute top-5 end-5 flex items-center gap-2 z-10">
          <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} data-testid="os-login-lang-toggle"
            className={`inline-flex items-center gap-1.5 border ${k.ghost} px-3 py-1.5 text-xs rounded-md transition-colors duration-200`}>
            <Globe className="w-3.5 h-3.5" /> {lang === "ar" ? "EN" : "AR"}
          </button>
          <button onClick={toggleTheme} data-testid="os-login-theme-toggle"
            className={`inline-flex items-center border ${k.ghost} p-1.5 rounded-md transition-colors duration-200`}>
            {k.dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <form onSubmit={submit}
          className={`relative w-full max-w-md ${k.cardBg} border ${k.cardBorder} p-10 rounded-xl shadow-xl`}
          data-testid="os-login-form">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-11 h-11 rounded-xl ${k.logoBg} flex items-center justify-center`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-[10px] tracking-[0.28em] uppercase font-mono ${k.muted}`}>UR SETUP · OS</p>
              <p className="font-semibold text-sm">{t.tagline}</p>
            </div>
          </div>
          <h1 className="text-3xl font-semibold mb-1 tracking-tight">{t.login.title}</h1>
          <p className={`text-sm mb-7 ${k.muted}`}>{t.login.subtitle}</p>

          <button type="button" onClick={googleLogin} data-testid="os-login-google-btn"
            className={`w-full inline-flex items-center justify-center gap-2 border ${k.ghost} rounded-md py-2.5 text-sm mb-4 transition-colors duration-200`}>
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            {t.login.google}
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className={`h-px flex-1 ${k.cardBorder} border-t`} />
            <span className={`text-xs ${k.muted}`}>{t.login.or}</span>
            <div className={`h-px flex-1 ${k.cardBorder} border-t`} />
          </div>

          <label className={`text-xs font-mono tracking-[0.15em] uppercase mb-1.5 block ${k.muted}`}>{t.login.email}</label>
          <div className="relative mb-4">
            <Mail className={`w-4 h-4 absolute top-3 start-3 ${k.muted}`} />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              data-testid="os-login-email"
              className={`w-full ps-9 pe-3 py-2.5 rounded-md border ${k.input} ${k.ring} transition-colors duration-200`}
              placeholder="ceo@ursetup.com" />
          </div>
          <label className={`text-xs font-mono tracking-[0.15em] uppercase mb-1.5 block ${k.muted}`}>{t.login.password}</label>
          <div className="relative mb-6">
            <KeyRound className={`w-4 h-4 absolute top-3 start-3 ${k.muted}`} />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              data-testid="os-login-password"
              className={`w-full ps-9 pe-3 py-2.5 rounded-md border ${k.input} ${k.ring} transition-colors duration-200`}
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={busy} data-testid="os-login-submit"
            className={`w-full inline-flex items-center justify-center gap-2 ${k.primary} rounded-md py-2.5 text-sm font-medium disabled:opacity-50 transition-colors duration-200 active:scale-[0.98]`}>
            <LogIn className="w-4 h-4" /> {busy ? t.common.loading : t.login.submit}
          </button>
          <p className="text-center text-xs mt-6">
            <a href="/" className={`${k.muted} hover:${k.shellText} transition-colors duration-200`}>{t.login.back}</a>
          </p>
        </form>
      </div>
    </div>
  );
}
