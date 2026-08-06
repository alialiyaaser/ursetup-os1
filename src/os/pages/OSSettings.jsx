import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Sun, Moon, Globe, User, ShieldCheck, Save, Plug, Check, X } from "lucide-react";
import { useLang } from "../../contexts/LangContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { osApi } from "../api";

const INT_META = {
  salla: {
    name: "Salla (المتجر)",
    hint: "الطلبات، العملاء، المنتجات تجيك مباشرة من متجر سلة",
    fields: [
      { name: "access_token", label: "Access Token", secret: true, placeholder: "sxxxxxxx", hint: "من لوحة تحكم سلة → التطبيقات → المفاتيح" },
      { name: "store_id", label: "Store ID", placeholder: "12345" },
      { name: "webhook_secret", label: "Webhook Secret", secret: true, placeholder: "اختياري" },
    ],
  },
  whatsapp: {
    name: "WhatsApp Business",
    hint: "الرد على العملاء من داخل النظام",
    fields: [
      { name: "phone_id", label: "Phone Number ID", placeholder: "123456789" },
      { name: "access_token", label: "Access Token", secret: true },
    ],
  },
  email: {
    name: "Email (SendGrid / Resend)",
    hint: "إرسال إشعارات وحملات بريدية",
    fields: [
      { name: "provider", label: "Provider", placeholder: "sendgrid | resend" },
      { name: "api_key", label: "API Key", secret: true },
      { name: "from_email", label: "From Email", placeholder: "no-reply@ursetup.com" },
    ],
  },
};

export default function OSSettings() {
  const { t, k, perms } = useOutletContext();
  const { lang, set: setLang } = useLang();
  const { theme: currentTheme, setTheme } = useTheme();
  const { user, setUser } = useAuth();
  const canManageRoles = perms.includes("settings.manage");
  const canManageInt = perms.includes("integrations.manage");

  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState({});
  const [selectedRole, setSelectedRole] = useState("");
  const [editing, setEditing] = useState([]);
  const [saving, setSaving] = useState(false);
  const [integrations, setIntegrations] = useState([]);
  const [editingInt, setEditingInt] = useState(null); // {key, credentials, enabled}

  const loadRoles = useCallback(async () => {
    if (!canManageRoles) return;
    try {
      const r = await osApi.get("/roles");
      setRoles(r.data.roles);
      setCatalog(r.data.permissions_catalog);
      if (!selectedRole && r.data.roles.length) {
        const first = r.data.roles.find((x) => x.name !== "Pending") || r.data.roles[0];
        setSelectedRole(first.name);
        setEditing(first.permissions || []);
      }
    } catch (e) { /* ignore */ }
  }, [canManageRoles, selectedRole]);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const loadIntegrations = useCallback(async () => {
    try {
      const r = await osApi.get("/integrations");
      setIntegrations(r.data);
    } catch (e) { /* ignore */ }
  }, []);
  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  const saveIntegration = async () => {
    if (!editingInt) return;
    try {
      await osApi.put(`/integrations/${editingInt.key}`, editingInt);
      toast.success(t.common.updated);
      setEditingInt(null);
      loadIntegrations();
    } catch (err) {
      toast.error(typeof err.response?.data?.detail === "string" ? err.response.data.detail : t.common.failed);
    }
  };

  const disconnectIntegration = async (key) => {
    try {
      await osApi.delete(`/integrations/${key}`);
      toast.success(t.common.deleted);
      loadIntegrations();
    } catch { toast.error(t.common.failed); }
  };

  const selectRole = (name) => {
    setSelectedRole(name);
    const r = roles.find((x) => x.name === name);
    setEditing(r?.permissions || []);
  };

  const savePref = async (patch) => {
    try {
      const { data } = await osApi.patch("/preferences", patch);
      setUser({ ...user, ...data });
      toast.success(t.common.updated);
    } catch { toast.error(t.common.failed); }
  };

  const saveRole = async () => {
    setSaving(true);
    try {
      await osApi.put(`/roles/${encodeURIComponent(selectedRole)}`, {
        name: selectedRole,
        permissions: editing,
        description: "",
      });
      toast.success(t.common.updated);
      loadRoles();
    } catch (err) {
      toast.error(typeof err.response?.data?.detail === "string" ? err.response.data.detail : t.common.failed);
    } finally { setSaving(false); }
  };

  return (
    <div data-testid="os-settings" className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.settings.title}</h1>
      </div>

      <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <User className={`w-4 h-4 ${k.muted}`} />
          <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>{t.settings.profile}</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div><p className={`text-xs ${k.muted}`}>{t.employees.name}</p><p>{user?.name}</p></div>
          <div><p className={`text-xs ${k.muted}`}>{t.employees.email}</p><p>{user?.email}</p></div>
          <div><p className={`text-xs ${k.muted}`}>{t.employees.role}</p><p>{user?.role}</p></div>
        </div>
      </div>

      <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <Globe className={`w-4 h-4 ${k.muted}`} />
          <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>{t.settings.language}</p>
        </div>
        <div className="flex gap-2">
          {["ar", "en"].map((l) => (
            <button key={l} onClick={() => { setLang(l); savePref({ language: l }); }} data-testid={`settings-lang-${l}`}
              className={`px-4 py-2 rounded-md text-sm border transition-colors duration-200 ${lang === l ? k.primary : k.ghost}`}>
              {l === "ar" ? "العربية" : "English"}
            </button>
          ))}
        </div>
      </div>

      <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          {k.dark ? <Moon className={`w-4 h-4 ${k.muted}`} /> : <Sun className={`w-4 h-4 ${k.muted}`} />}
          <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>{t.settings.theme}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setTheme("dark"); savePref({ theme: "dark" }); }} data-testid="settings-theme-dark"
            className={`px-4 py-2 rounded-md text-sm border transition-colors duration-200 inline-flex items-center gap-2 ${currentTheme === "dark" ? k.primary : k.ghost}`}>
            <Moon className="w-4 h-4" /> {t.settings.dark}
          </button>
          <button onClick={() => { setTheme("light"); savePref({ theme: "light" }); }} data-testid="settings-theme-light"
            className={`px-4 py-2 rounded-md text-sm border transition-colors duration-200 inline-flex items-center gap-2 ${currentTheme === "light" ? k.primary : k.ghost}`}>
            <Sun className="w-4 h-4" /> {t.settings.light}
          </button>
        </div>
      </div>

      {canManageRoles && (
        <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} p-6`}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className={`w-4 h-4 ${k.muted}`} />
            <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>{t.settings.roles_perms}</p>
          </div>
          <p className={`text-xs ${k.muted} mb-4`}>{t.settings.roles_perms_hint}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {roles.filter((r) => r.name !== "Pending").map((r) => (
              <button key={r.name} onClick={() => selectRole(r.name)} data-testid={`role-tab-${r.name}`}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors duration-200 ${selectedRole === r.name ? k.primary : k.ghost}`}>
                {r.name}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            {Object.entries(catalog).map(([key, label]) => {
              const checked = editing.includes(key);
              return (
                <label key={key} data-testid={`role-perm-${key}`}
                  className={`flex items-start gap-2.5 p-2.5 border ${k.cardBorder} rounded-md cursor-pointer ${k.hover}`}>
                  <input type="checkbox" checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked ? [...editing, key] : editing.filter((p) => p !== key);
                      setEditing(next);
                    }} className="mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm">{key}</p>
                    <p className={`text-xs ${k.muted}`}>{label}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className={`text-xs ${k.muted}`}>{t.settings.perms_selected}: <span className={k.subtle}>{editing.length}</span></p>
            <button onClick={saveRole} disabled={saving || !selectedRole} data-testid="role-save-btn"
              className={`${k.primary} rounded-md px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50 transition-colors duration-200`}>
              <Save className="w-4 h-4" /> {saving ? t.common.loading : t.settings.save_role}
            </button>
          </div>
        </div>
      )}

      {canManageInt && (
        <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} p-6`} data-testid="os-integrations">
          <div className="flex items-center gap-2 mb-2">
            <Plug className={`w-4 h-4 ${k.muted}`} />
            <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>
              {lang === "ar" ? "التكاملات" : "Integrations"}
            </p>
          </div>
          <p className={`text-xs ${k.muted} mb-4`}>
            {lang === "ar"
              ? "أضف مفاتيح API لتفعيل التكاملات. الطلبات الجديدة من سلة ستظهر تلقائيًا بمجرد التفعيل — بدون إعادة تشغيل."
              : "Add API keys to activate integrations. New Salla orders will appear automatically once enabled — no restart needed."}
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {integrations.map((it) => {
              const meta = INT_META[it.key] || { name: it.key, hint: "" };
              const connected = it.status === "connected";
              return (
                <div key={it.key} data-testid={`int-card-${it.key}`}
                  className={`border ${k.cardBorder} rounded-lg p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{meta.name}</p>
                      <p className={`text-xs ${k.muted}`}>{meta.hint}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${connected ? "border-emerald-500/40 text-emerald-500" : k.chip}`}>
                      {connected ? (lang === "ar" ? "مفعّل" : "connected") : (lang === "ar" ? "غير مربوط" : "not connected")}
                    </span>
                  </div>
                  {connected && it.credentials && (
                    <div className={`text-[10px] font-mono ${k.muted} mb-2 space-y-0.5`}>
                      {Object.entries(it.credentials).map(([kk, vv]) => (
                        <div key={kk}>{kk}: {String(vv)}</div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={() => setEditingInt({ key: it.key, enabled: true, credentials: {} })}
                      data-testid={`int-connect-${it.key}`}
                      className={`text-xs px-2.5 py-1.5 rounded-md border ${k.ghost} transition-colors duration-200`}>
                      {connected ? (lang === "ar" ? "تعديل" : "Edit") : (lang === "ar" ? "ربط" : "Connect")}
                    </button>
                    {connected && (
                      <button onClick={() => disconnectIntegration(it.key)} data-testid={`int-disconnect-${it.key}`}
                        className={`text-xs px-2.5 py-1.5 rounded-md border ${k.danger} transition-colors duration-200`}>
                        {lang === "ar" ? "فصل" : "Disconnect"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editingInt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditingInt(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-lg ${k.cardBg} border ${k.cardBorder} rounded-xl p-6`}
            data-testid="int-edit-modal">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold">{(INT_META[editingInt.key] || {}).name || editingInt.key}</p>
                <p className={`text-xs ${k.muted}`}>{(INT_META[editingInt.key] || {}).hint || ""}</p>
              </div>
              <button onClick={() => setEditingInt(null)} className={k.muted}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {(INT_META[editingInt.key]?.fields || []).map((f) => (
                <div key={f.name}>
                  <label className={`text-[10px] font-mono tracking-[0.2em] uppercase mb-1.5 block ${k.muted}`}>{f.label}</label>
                  <input type={f.secret ? "password" : "text"} value={editingInt.credentials[f.name] || ""}
                    onChange={(e) => setEditingInt({ ...editingInt, credentials: { ...editingInt.credentials, [f.name]: e.target.value } })}
                    placeholder={f.placeholder || ""} data-testid={`int-field-${f.name}`}
                    className={`w-full px-3 py-2 rounded-md border text-sm ${k.input} ${k.ring}`} />
                  {f.hint && <p className={`text-[10px] mt-1 ${k.muted}`}>{f.hint}</p>}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={saveIntegration} data-testid="int-save"
                className={`${k.primary} rounded-md px-4 py-2 text-sm inline-flex items-center gap-2 transition-colors duration-200`}>
                <Check className="w-4 h-4" /> {t.common.save}
              </button>
              <button onClick={() => setEditingInt(null)}
                className={`border ${k.ghost} rounded-md px-4 py-2 text-sm ms-auto transition-colors duration-200`}>
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
