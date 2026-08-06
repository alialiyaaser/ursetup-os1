import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { api } from "../../lib/api";

export default function AdminPromo() {
  const [form, setForm] = useState({ text_en: "", text_ar: "", link: "", active: true });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/admin/promo-banner").then((r) => setForm({ ...r.data, link: r.data.link || "" })).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put("/admin/promo-banner", { ...form, link: form.link || null });
      toast.success("Saved");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div data-testid="admin-promo">
      <h1 className="font-display text-3xl font-bold mb-1">Promo Banner</h1>
      <p className="text-neutral-400 text-sm mb-8">The top strip visible on every page.</p>

      <form onSubmit={save} className="border border-white/10 bg-[#0f0f0f] p-6 grid md:grid-cols-2 gap-4 max-w-4xl">
        <div>
          <label className="kicker mb-2 block">Text (English)</label>
          <input
            value={form.text_en}
            onChange={(e) => setForm({ ...form, text_en: e.target.value })}
            data-testid="promo-text-en"
            className="w-full bg-black/60 border border-white/15 px-4 py-3 text-white focus:border-white/50"
          />
        </div>
        <div>
          <label className="kicker mb-2 block">Text (Arabic)</label>
          <input
            value={form.text_ar}
            onChange={(e) => setForm({ ...form, text_ar: e.target.value })}
            data-testid="promo-text-ar"
            className="w-full bg-black/60 border border-white/15 px-4 py-3 text-white focus:border-white/50"
          />
        </div>
        <div className="md:col-span-2">
          <label className="kicker mb-2 block">Link (optional)</label>
          <input
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            data-testid="promo-link"
            placeholder="https://... or #coming-soon"
            className="w-full bg-black/60 border border-white/15 px-4 py-3 text-white focus:border-white/50"
          />
        </div>
        <div className="md:col-span-2 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              data-testid="promo-active"
              className="w-4 h-4"
            /> Active
          </label>
          <button
            type="submit"
            disabled={busy}
            data-testid="promo-save"
            className="ms-auto inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 text-xs tracking-[0.22em] uppercase font-semibold hover:bg-neutral-200 disabled:opacity-50 transition-colors duration-300"
          >
            <Save className="w-3.5 h-3.5" /> {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
