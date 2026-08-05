import React, { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2, Circle, KeyRound, X, CheckCircle2 } from "lucide-react";
import { osApi } from "../api";
import { formatRelative } from "../i18n";

const EMPTY = { name: "", email: "", password: "", role: "Support", language: "ar" };

export default function OSEmployees() {
  const { user: me, t, lang, k, perms } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [catalog, setCatalog] = useState({});
  const [roleDefaults, setRoleDefaults] = useState({});
  const [availableRoles, setAvailableRoles] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [editPerms, setEditPerms] = useState(null); // {id, name, role, permissions, permissions_customized}
  const canManage = perms.includes("employees.manage");

  const load = useCallback(async () => {
    try {
      const [r, cat, roles] = await Promise.all([
        osApi.get("/employees"),
        osApi.get("/permissions-catalog"),
        osApi.get("/roles"),
      ]);
      setRows(r.data);
      setCatalog(cat.data.catalog);
      setRoleDefaults(cat.data.default_role_perms || {});
      setAvailableRoles(roles.data.roles.map((x) => x.name).filter((n) => n !== "Pending"));
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live refresh every 12s so online/offline status updates without reload.
  useEffect(() => {
    const int = setInterval(load, 12000);
    return () => clearInterval(int);
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await osApi.post("/employees", form);
      toast.success(t.common.created);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(typeof err.response?.data?.detail === "string" ? err.response.data.detail : t.common.failed);
    } finally { setBusy(false); }
  };

  const changeRole = async (uid, role) => {
    try {
      await osApi.patch(`/employees/${uid}`, { role });
      toast.success(t.common.updated);
      load();
    } catch (err) {
      toast.error(typeof err.response?.data?.detail === "string" ? err.response.data.detail : t.common.failed);
    }
  };

  const savePerms = async () => {
    if (!editPerms) return;
    try {
      await osApi.patch(`/employees/${editPerms.id}`, { permissions: editPerms.permissions });
      toast.success(t.common.updated);
      setEditPerms(null);
      load();
    } catch (err) {
      toast.error(typeof err.response?.data?.detail === "string" ? err.response.data.detail : t.common.failed);
    }
  };

  const approve = async (u) => {
    // Approve a Pending user: set to Support with role defaults
    try {
      await osApi.patch(`/employees/${u.id}`, { role: "Support" });
      toast.success(t.common.updated);
      load();
    } catch { toast.error(t.common.failed); }
  };

  const del = async (uid) => {
    if (!window.confirm(t.employees.confirm_delete)) return;
    try { await osApi.delete(`/employees/${uid}`); toast.success(t.common.deleted); load(); }
    catch { toast.error(t.common.failed); }
  };

  return (
    <div data-testid="os-employees" className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.employees.title}</h1>
        <p className={`mt-1 text-sm ${k.muted}`}>{t.employees.subtitle}</p>
      </div>

      {canManage && (
        <form onSubmit={create} className={`border rounded-xl p-5 ${k.cardBg} ${k.cardBorder} grid md:grid-cols-5 gap-3`} data-testid="emp-add-form">
          <input required placeholder={t.employees.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            data-testid="emp-name" className={`w-full px-3 py-2 rounded-md border text-sm ${k.input} ${k.ring}`} />
          <input required type="email" placeholder={t.employees.email} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            data-testid="emp-email" className={`w-full px-3 py-2 rounded-md border text-sm ${k.input} ${k.ring}`} />
          <input required type="password" placeholder={t.employees.password + " (6+)"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            data-testid="emp-password" className={`w-full px-3 py-2 rounded-md border text-sm ${k.input} ${k.ring}`} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} data-testid="emp-role"
            className={`w-full px-3 py-2 rounded-md border text-sm ${k.input} ${k.ring}`}>
            {availableRoles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="submit" disabled={busy} data-testid="emp-add-btn"
            className={`${k.primary} text-sm rounded-md px-4 py-2 disabled:opacity-50 transition-colors duration-200 inline-flex items-center justify-center gap-2 active:scale-[0.98]`}>
            <Plus className="w-4 h-4" /> {busy ? t.common.loading : t.employees.add}
          </button>
        </form>
      )}

      <div className={`border rounded-xl overflow-x-auto ${k.cardBg} ${k.cardBorder}`}>
        <table className="w-full text-sm">
          <thead className={k.tableHead}>
            <tr className={`text-[10px] font-mono tracking-[0.2em] uppercase`}>
              <th className="text-start px-4 py-3">{t.employees.name}</th>
              <th className="text-start px-4 py-3">{t.employees.email}</th>
              <th className="text-start px-4 py-3">{t.employees.role}</th>
              <th className="text-start px-4 py-3">{t.employees.status}</th>
              <th className="text-start px-4 py-3">{t.employees.last_seen}</th>
              {canManage && <th className="text-start px-4 py-3">{t.employees.actions}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const online = u.status === "online";
              const isPending = u.role === "Pending";
              return (
                <tr key={u.id} className={`border-t ${k.rowBorder}`} data-testid={`emp-row-${u.id}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${k.logoBg} flex items-center justify-center text-xs font-semibold`}>
                        {(u.name || u.email).slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p>{u.name}{u.id === me.id && <span className={`ms-2 text-xs ${k.muted}`}>{t.employees.you}</span>}</p>
                        {u.permissions_customized && !isPending && (
                          <p className={`text-[10px] ${k.muted}`}>· custom permissions</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 py-3 ${k.subtle}`}>{u.email}</td>
                  <td className="px-4 py-3">
                    {canManage && u.id !== me.id ? (
                      <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}
                        data-testid={`emp-role-${u.id}`}
                        className={`text-xs px-2 py-1.5 rounded-md border ${k.input}`}>
                        {availableRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                        {!availableRoles.includes(u.role) && <option value={u.role}>{u.role}</option>}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${k.chip}`}>{u.role}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isPending ? (
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${k.chip}`}>
                        <Circle className="w-2 h-2 fill-amber-500 text-amber-500" /> {t.employees.pending}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <Circle className={`w-2 h-2 ${online ? k.online : k.offline}`} />
                        {online ? t.employees.online : t.employees.offline}
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-xs ${k.muted}`}>
                    {u.last_seen ? formatRelative(u.last_seen, lang) : t.employees.never}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {isPending && (
                          <button onClick={() => approve(u)} data-testid={`emp-approve-${u.id}`}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 transition-colors duration-200">
                            <CheckCircle2 className="w-3 h-3" /> {t.employees.approve}
                          </button>
                        )}
                        <button onClick={() => setEditPerms({ ...u, permissions: u.permissions || [] })}
                          data-testid={`emp-perms-${u.id}`}
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border ${k.ghost} transition-colors duration-200`}>
                          <KeyRound className="w-3 h-3" /> {t.employees.edit_perms}
                        </button>
                        {u.id !== me.id && (
                          <button onClick={() => del(u.id)} data-testid={`emp-del-${u.id}`}
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border ${k.danger} transition-colors duration-200`}>
                            <Trash2 className="w-3 h-3" /> {t.employees.delete}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editPerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditPerms(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-2xl ${k.cardBg} border ${k.cardBorder} rounded-xl p-6 max-h-[85vh] overflow-y-auto`}
            data-testid="emp-perms-modal">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold">{editPerms.name}</p>
                <p className={`text-xs ${k.muted}`}>{t.employees.custom_perms} · {editPerms.role}</p>
              </div>
              <button onClick={() => setEditPerms(null)} className={k.muted}><X className="w-5 h-5" /></button>
            </div>
            <p className={`text-xs ${k.muted} mb-4`}>{t.employees.custom_perms_hint}</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {Object.entries(catalog).map(([key, label]) => {
                const checked = editPerms.permissions.includes(key);
                const inRoleDefault = (roleDefaults[editPerms.role] || []).includes(key);
                return (
                  <label key={key} data-testid={`perm-check-${key}`}
                    className={`flex items-start gap-2.5 p-2.5 border ${k.cardBorder} rounded-md cursor-pointer ${k.hover}`}>
                    <input type="checkbox" checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...editPerms.permissions, key]
                          : editPerms.permissions.filter((p) => p !== key);
                        setEditPerms({ ...editPerms, permissions: next });
                      }} className="mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm">{key}</p>
                      <p className={`text-xs ${k.muted}`}>{label}{inRoleDefault && " · role default"}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={savePerms} data-testid="emp-perms-save"
                className={`${k.primary} rounded-md px-4 py-2 text-sm inline-flex items-center gap-2 transition-colors duration-200`}>
                <CheckCircle2 className="w-4 h-4" /> {t.common.save}
              </button>
              <button onClick={() => { setEditPerms({ ...editPerms, permissions: [] }); }}
                className={`border ${k.ghost} rounded-md px-4 py-2 text-sm transition-colors duration-200`}>
                {t.common.no} · reset to role default
              </button>
              <button onClick={() => setEditPerms(null)}
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
