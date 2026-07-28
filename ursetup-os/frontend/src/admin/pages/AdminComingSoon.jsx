import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { api } from "../../lib/api";

const EMPTY = {
  name_en: "",
  name_ar: "",
  desc_en: "",
  desc_ar: "",
  image: "",
  launch_at: "",
  active: true,
};

export default function AdminComingSoon() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/admin/coming-soon");
      setRows(r.data);
    } catch {
      toast.error("Failed to load");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form };
      if (payload.launch_at && !payload.launch_at.includes("T")) {
        payload.launch_at = new Date(payload.launch_at).toISOString();
      } else if (payload.launch_at) {
        payload.launch_at = new Date(payload.launch_at).toISOString();
      }
      await api.post("/admin/coming-soon", payload);
      toast.success("Drop created");
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id, updates) => {
    try { await api.patch(`/admin/coming-soon/${id}`, updates); toast.success("Updated"); load(); }
    catch { toast.error("Failed"); }
  };
  const del = async (id) => {
    if (!window.confirm("Delete this upcoming drop?")) return;
    try { await api.delete(`/admin/coming-soon/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Failed"); }
  };

  return (
    <div data-testid="admin-coming-soon">
      <h1 className="font-display text-3xl font-bold mb-1">Coming Soon</h1>
      <p className="text-neutral-400 text-sm mb-8">Manage upcoming product drops and their countdown.</p>

      <form onSubmit={submit} className="border border-white/10 bg-[#0f0f0f] p-6 mb-10 grid md:grid-cols-2 gap-4">
        <Field label="Name (English)" value={form.name_en} onChange={(v) => setForm({ ...form, name_en: v })} required testid="cs-name-en" />
        <Field label="Name (Arabic)" value={form.name_ar} onChange={(v) => setForm({ ...form, name_ar: v })} required testid="cs-name-ar" />
        <Field label="Description (English)" value={form.desc_en} onChange={(v) => setForm({ ...form, desc_en: v })} textarea testid="cs-desc-en" />
        <Field label="Description (Arabic)" value={form.desc_ar} onChange={(v) => setForm({ ...form, desc_ar: v })} textarea testid="cs-desc-ar" />
        <Field label="Image URL" value={form.image} onChange={(v) => setForm({ ...form, image: v })} required testid="cs-image" />
        <div>
          <label className="kicker mb-2 block">Launch datetime</label>
          <input
            type="datetime-local"
            required
            value={form.launch_at}
            onChange={(e) => setForm({ ...form, launch_at: e.target.value })}
            data-testid="cs-launch-at"
            className="w-full bg-black/60 border border-white/15 px-4 py-3 text-white focus:border-white/50"
          />
        </div>
        <div className="md:col-span-2 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4"
            /> Active (visible on site)
          </label>
          <button
            type="submit"
            disabled={busy}
            data-testid="cs-create-btn"
            className="ms-auto inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 text-xs tracking-[0.22em] uppercase font-semibold hover:bg-neutral-200 disabled:opacity-50 transition-colors duration-300"
          >
            <Plus className="w-3.5 h-3.5" /> {busy ? "Creating…" : "Add drop"}
          </button>
        </div>
      </form>

      <div className="grid md:grid-cols-2 gap-5">
        {rows.map((r) => (
          <article key={r.id} className="border border-white/10 bg-[#0f0f0f] overflow-hidden" data-testid={`cs-item-${r.id}`}>
            {r.image && <img src={r.image} alt="" className="w-full aspect-[16/9] object-cover" />}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="kicker mb-1">{new Date(r.launch_at).toLocaleString()}</p>
                  <h3 className="font-display font-bold text-white text-lg">{r.name_en}</h3>
                  <p className="text-neutral-400 text-sm mt-1">{r.name_ar}</p>
                </div>
                <span className={`text-[10px] tracking-widest uppercase px-2 py-1 rounded-full border ${r.active ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10" : "border-white/15 text-neutral-500"}`}>
                  {r.active ? "Live" : "Draft"}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => patch(r.id, { active: !r.active })}
                  className="border border-white/15 px-3 py-1.5 text-xs hover:bg-white hover:text-black transition-colors duration-300"
                >
                  {r.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => del(r.id)}
                  className="border border-red-500/40 text-red-300 px-3 py-1.5 text-xs hover:bg-red-500 hover:text-black transition-colors duration-300 inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, textarea, testid }) {
  return (
    <div>
      <label className="kicker mb-2 block">{label}</label>
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          data-testid={testid}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full bg-black/60 border border-white/15 px-4 py-3 text-white focus:border-white/50 resize-none"
        />
      ) : (
        <input
          value={value}
          data-testid={testid}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full bg-black/60 border border-white/15 px-4 py-3 text-white focus:border-white/50"
        />
      )}
    </div>
  );
}
