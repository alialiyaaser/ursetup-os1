import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { api } from "../../lib/api";

export default function AdminNewsletter() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api.get("/admin/newsletter").then((r) => setRows(r.data)).catch(() => toast.error("Failed to load"));
  }, []);

  const exportCSV = () => {
    const header = "id,email,language,created_at\n";
    const body = rows.map((r) => `${r.id},${r.email},${r.language || ""},${r.created_at || ""}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ursetup-newsletter.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="admin-newsletter">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Newsletter</h1>
          <p className="text-neutral-400 text-sm">{rows.length} subscriber{rows.length === 1 ? "" : "s"}</p>
        </div>
        <button
          onClick={exportCSV}
          data-testid="newsletter-export"
          className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 text-xs tracking-[0.22em] uppercase font-semibold hover:bg-neutral-200 transition-colors duration-300"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-neutral-400">
            <tr>
              <th className="text-start px-4 py-3 kicker">Email</th>
              <th className="text-start px-4 py-3 kicker">Language</th>
              <th className="text-start px-4 py-3 kicker">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td className="px-4 py-8 text-neutral-500" colSpan={3}>No subscribers yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="px-4 py-3 text-white">{r.email}</td>
                <td className="px-4 py-3 text-neutral-400 uppercase">{r.language}</td>
                <td className="px-4 py-3 text-neutral-500">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
