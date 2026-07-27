import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ShieldAlert, Key } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { api } from "../../lib/api";

const ROLE_LABEL = {
  super_admin: "Super Admin",
  admin: "Admin",
  moderator: "Moderator",
};

const EMPTY = { email: "", name: "", password: "", role: "moderator" };

export default function AdminUsers() {
  const { user: me } = useOutletContext();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [pwForm, setPwForm] = useState({ open: false, uid: null, password: "" });

  const load = useCallback(async () => {
    try {
      const r = await api.get("/admin/users");
      setUsers(r.data);
    } catch { toast.error("Failed to load"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/users", form);
      toast.success("User created");
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Failed");
    } finally { setBusy(false); }
  };

  const del = async (uid) => {
    if (!window.confirm("Remove this team member?")) return;
    try { await api.delete(`/admin/users/${uid}`); toast.success("Removed"); load(); }
    catch (err) {
      toast.error(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Failed");
    }
  };

  const changeRole = async (uid, role) => {
    try { await api.patch(`/admin/users/${uid}`, { role }); toast.success("Role updated"); load(); }
    catch { toast.error("Failed"); }
  };

  const savePassword = async () => {
    if (pwForm.password.length < 8) { toast.error("Password must be 8+ chars"); return; }
    try {
      await api.patch(`/admin/users/${pwForm.uid}`, { password: pwForm.password });
      toast.success("Password reset");
      setPwForm({ open: false, uid: null, password: "" });
    } catch { toast.error("Failed"); }
  };

  return (
    <div data-testid="admin-users">
      <h1 className="font-display text-3xl font-bold mb-1">Team Members</h1>
      <p className="text-neutral-400 text-sm mb-8">Add, remove, or change permissions. Super Admin only.</p>

      <form onSubmit={create} className="border border-white/10 bg-[#0f0f0f] p-6 mb-10 grid md:grid-cols-4 gap-4">
        <input required placeholder="Name" data-testid="user-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-black/60 border border-white/15 px-4 py-3 text-white focus:border-white/50" />
        <input required type="email" placeholder="email@ursetup.sa" data-testid="user-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-black/60 border border-white/15 px-4 py-3 text-white focus:border-white/50" />
        <input required type="password" placeholder="Password (8+)" data-testid="user-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-black/60 border border-white/15 px-4 py-3 text-white focus:border-white/50" />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} data-testid="user-role" className="bg-black/60 border border-white/15 px-4 py-3 text-white focus:border-white/50">
          <option value="moderator" className="bg-black">Moderator</option>
          <option value="admin" className="bg-black">Admin</option>
          <option value="super_admin" className="bg-black">Super Admin</option>
        </select>
        <div className="md:col-span-4 flex justify-end">
          <button type="submit" disabled={busy} data-testid="user-create-btn" className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 text-xs tracking-[0.22em] uppercase font-semibold hover:bg-neutral-200 disabled:opacity-50 transition-colors duration-300">
            <Plus className="w-3.5 h-3.5" /> {busy ? "Creating…" : "Add member"}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-neutral-400">
            <tr>
              <th className="text-start px-4 py-3 kicker">Name</th>
              <th className="text-start px-4 py-3 kicker">Email</th>
              <th className="text-start px-4 py-3 kicker">Role</th>
              <th className="text-start px-4 py-3 kicker">Joined</th>
              <th className="text-start px-4 py-3 kicker">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-white/10" data-testid={`user-row-${u.id}`}>
                <td className="px-4 py-3 text-white">
                  {u.name} {u.id === me.id && <span className="ms-2 text-xs text-neutral-500">(you)</span>}
                </td>
                <td className="px-4 py-3 text-neutral-300">{u.email}</td>
                <td className="px-4 py-3">
                  {u.id === me.id ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white/10 border border-white/20">
                      <ShieldAlert className="w-3 h-3" /> {ROLE_LABEL[u.role]}
                    </span>
                  ) : (
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="bg-black/60 border border-white/15 px-2 py-1.5 text-white text-xs focus:border-white/50"
                    >
                      <option value="moderator" className="bg-black">Moderator</option>
                      <option value="admin" className="bg-black">Admin</option>
                      <option value="super_admin" className="bg-black">Super Admin</option>
                    </select>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPwForm({ open: true, uid: u.id, password: "" })}
                      className="inline-flex items-center gap-1 border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white hover:text-black transition-colors duration-300"
                    >
                      <Key className="w-3 h-3" /> Reset password
                    </button>
                    {u.id !== me.id && (
                      <button
                        onClick={() => del(u.id)}
                        data-testid={`user-delete-${u.id}`}
                        className="inline-flex items-center gap-1 border border-red-500/40 text-red-300 px-2.5 py-1.5 text-xs hover:bg-red-500 hover:text-black transition-colors duration-300"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pwForm.open && (
        <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-md flex items-center justify-center px-4" onClick={() => setPwForm({ open: false, uid: null, password: "" })}>
          <div className="bg-[#0f0f0f] border border-white/10 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <p className="kicker mb-3">RESET PASSWORD</p>
            <h3 className="font-display text-xl font-bold mb-4">Set a new password</h3>
            <input
              type="password"
              value={pwForm.password}
              onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })}
              placeholder="8+ characters"
              className="w-full bg-black/60 border border-white/15 px-4 py-3 text-white focus:border-white/50 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setPwForm({ open: false, uid: null, password: "" })} className="border border-white/15 px-4 py-2 text-xs uppercase tracking-widest">Cancel</button>
              <button onClick={savePassword} className="bg-white text-black px-4 py-2 text-xs uppercase tracking-widest font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
