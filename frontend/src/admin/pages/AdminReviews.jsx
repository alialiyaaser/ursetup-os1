import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Star, Check, EyeOff, Eye, Trash2 } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { api } from "../../lib/api";
import { hasRole } from "../../contexts/AuthContext";

export default function AdminReviews() {
  const { user } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/reviews");
      setRows(r.data);
    } catch (e) {
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = async (id, updates) => {
    try {
      await api.patch(`/admin/reviews/${id}`, updates);
      toast.success("Updated");
      load();
    } catch {
      toast.error("Failed");
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this review permanently?")) return;
    try {
      await api.delete(`/admin/reviews/${id}`);
      toast.success("Deleted");
      load();
    } catch {
      toast.error("Failed");
    }
  };

  return (
    <div data-testid="admin-reviews">
      <h1 className="font-display text-3xl font-bold mb-1">Reviews</h1>
      <p className="text-neutral-400 text-sm mb-8">Approve, hide, or delete community reviews.</p>

      <div className="overflow-x-auto border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-neutral-400">
            <tr>
              <th className="text-start px-4 py-3 kicker">Rating</th>
              <th className="text-start px-4 py-3 kicker">Author</th>
              <th className="text-start px-4 py-3 kicker">Product</th>
              <th className="text-start px-4 py-3 kicker">Comment</th>
              <th className="text-start px-4 py-3 kicker">Status</th>
              <th className="text-start px-4 py-3 kicker">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="px-4 py-8 text-neutral-500" colSpan={6}>Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td className="px-4 py-8 text-neutral-500" colSpan={6}>No reviews yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10 align-top" data-testid={`admin-review-${r.id}`}>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? "fill-white text-white" : "text-white/20"}`} />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <p className="text-white">{r.name}</p>
                  <p className="text-neutral-500 text-xs">{r.country || "—"}</p>
                </td>
                <td className="px-4 py-4 text-neutral-300 text-xs">{r.product}</td>
                <td className="px-4 py-4 text-neutral-300 max-w-md">
                  {r.title && <p className="text-white font-medium mb-1">{r.title}</p>}
                  <p className="text-neutral-400">{r.comment}</p>
                </td>
                <td className="px-4 py-4">
                  {r.hidden ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">Hidden</span>
                  ) : r.verified ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Verified</span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">Pending</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => patch(r.id, { verified: !r.verified })}
                      data-testid={`review-verify-${r.id}`}
                      className="inline-flex items-center gap-1 border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white hover:text-black transition-colors duration-300"
                    >
                      <Check className="w-3 h-3" /> {r.verified ? "Unverify" : "Verify"}
                    </button>
                    <button
                      onClick={() => patch(r.id, { hidden: !r.hidden })}
                      data-testid={`review-hide-${r.id}`}
                      className="inline-flex items-center gap-1 border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white hover:text-black transition-colors duration-300"
                    >
                      {r.hidden ? <><Eye className="w-3 h-3" /> Show</> : <><EyeOff className="w-3 h-3" /> Hide</>}
                    </button>
                    {hasRole(user, "super_admin", "admin") && (
                      <button
                        onClick={() => del(r.id)}
                        data-testid={`review-delete-${r.id}`}
                        className="inline-flex items-center gap-1 border border-red-500/40 text-red-300 px-2.5 py-1.5 text-xs hover:bg-red-500 hover:text-black transition-colors duration-300"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
