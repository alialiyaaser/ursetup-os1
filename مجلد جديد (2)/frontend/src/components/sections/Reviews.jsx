import React, { useCallback, useEffect, useState } from "react";
import { Star, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "../../contexts/LangContext";
import { api } from "../../lib/api";

export default function Reviews() {
  const { t } = useLang();
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ count: 0, average: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        api.get("/reviews", { params: { limit: 20 } }),
        api.get("/reviews/summary"),
      ]);
      setReviews(Array.isArray(r1.data) ? r1.data : []);
      setSummary(r2.data);
    } catch (e) {
      console.error("[Reviews] failed to load reviews:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = Math.max(summary.count, 1);
  const bd = summary.breakdown || {};

  return (
    <section id="reviews" data-testid="reviews-section" className="py-28 lg:py-36 bg-[#0A0A0A]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-14">
          <div className="max-w-2xl">
            <p className="kicker mb-4">{t.reviews.kicker}</p>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.02] tracking-tight text-white">
              {t.reviews.title}
            </h2>
            <p className="mt-6 text-neutral-400 leading-[1.9] max-w-xl">{t.reviews.subtitle}</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            data-testid="write-review-btn"
            className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-semibold text-sm tracking-[0.18em] uppercase hover:bg-neutral-200 transition-colors duration-300"
          >
            {t.reviews.writeCta}
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Summary card */}
          <aside className="lg:col-span-4 border border-white/10 bg-[#0f0f0f] p-8" data-testid="reviews-summary">
            <p className="kicker mb-3">{t.reviews.average}</p>
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-display text-6xl font-extrabold text-white">
                {(summary.average || 0).toFixed(1)}
              </span>
              <span className="text-neutral-400 text-sm">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`w-4 h-4 ${n <= Math.round(summary.average || 0) ? "fill-white text-white" : "text-white/25"}`}
                />
              ))}
            </div>
            <p className="text-neutral-500 text-sm">{t.reviews.basedOn(summary.count || 0)}</p>

            <div className="mt-8">
              <p className="kicker mb-4">{t.reviews.breakdown}</p>
              <div className="space-y-2.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const c = bd[star] || 0;
                  const pct = (c / total) * 100;
                  return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <span className="text-neutral-400 font-mono w-4">{star}</span>
                      <Star className="w-3 h-3 fill-white text-white" />
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-white" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-neutral-500 font-mono w-6 text-end">{c}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Review list */}
          <div className="lg:col-span-8 grid sm:grid-cols-2 gap-5" data-testid="reviews-list">
            {loading && (
              <>
                <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
              </>
            )}
            {!loading && reviews.length === 0 && (
              <p className="text-neutral-500 col-span-2">{t.reviews.empty}</p>
            )}
            {reviews.map((r) => (
              <article key={r.id} className="border border-white/10 bg-[#0f0f0f] p-6 hover:border-white/25 transition-colors duration-500" data-testid={`review-item-${r.id}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={`r-${r.id}-s${n}`} className={`w-3.5 h-3.5 ${n <= r.rating ? "fill-white text-white" : "text-white/20"}`} />
                    ))}
                  </div>
                  {r.verified && (
                    <span className="flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase text-emerald-400/80">
                      <CheckCircle2 className="w-3 h-3" />
                      {t.reviews.verified}
                    </span>
                  )}
                </div>
                {r.title && <h4 className="font-display text-lg font-bold text-white mb-2">{r.title}</h4>}
                <p className="text-neutral-300 leading-[1.85] text-sm mb-4">{r.comment}</p>
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="text-xs">
                    <p className="text-white font-medium">{r.name}</p>
                    <p className="text-neutral-500">{r.country || "—"}</p>
                  </div>
                  <p className="text-[10px] tracking-[0.18em] uppercase text-neutral-500 font-mono">
                    {t.products_slugs[r.product] || r.product}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {open && <ReviewFormModal onClose={() => setOpen(false)} onSubmitted={() => { setOpen(false); load(); }} />}
    </section>
  );
}

function SkeletonCard() {
  return (
    <div className="border border-white/10 bg-[#0f0f0f] p-6 animate-pulse">
      <div className="h-3 w-24 bg-white/10 mb-3" />
      <div className="h-4 w-40 bg-white/10 mb-3" />
      <div className="h-3 w-full bg-white/10 mb-2" />
      <div className="h-3 w-4/5 bg-white/10" />
    </div>
  );
}

function ReviewFormModal({ onClose, onSubmitted }) {
  const { t, lang } = useLang();
  const [form, setForm] = useState({
    name: "",
    country: "",
    product: "grey-marble",
    rating: 5,
    title: "",
    comment: "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.comment.trim() || form.comment.trim().length < 3) {
      toast.error(t.reviews.error);
      return;
    }
    setBusy(true);
    try {
      await api.post("/reviews", { ...form, language: lang });
      toast.success(t.reviews.success);
      onSubmitted();
    } catch (err) {
      toast.error(t.reviews.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-md flex items-center justify-center px-4 py-8"
      onClick={onClose}
      data-testid="review-modal"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#0d0d0d] border border-white/10 p-8 max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          data-testid="review-modal-close"
          className="absolute top-3 end-3 w-9 h-9 rounded-full bg-black/70 border border-white/15 flex items-center justify-center hover:bg-white hover:text-black transition-colors duration-300"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="kicker mb-3">UR SETUP</p>
        <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-6">{t.reviews.formTitle}</h3>

        <label className="block text-xs kicker mb-2">{t.reviews.name}</label>
        <input
          data-testid="review-name-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full bg-black/60 border border-white/15 px-4 py-3 mb-4 text-white placeholder-neutral-500 focus:border-white/50"
          required
          maxLength={80}
        />

        <label className="block text-xs kicker mb-2">{t.reviews.country}</label>
        <input
          data-testid="review-country-input"
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          className="w-full bg-black/60 border border-white/15 px-4 py-3 mb-4 text-white placeholder-neutral-500 focus:border-white/50"
          maxLength={60}
        />

        <label className="block text-xs kicker mb-2">{t.reviews.product}</label>
        <select
          data-testid="review-product-select"
          value={form.product}
          onChange={(e) => setForm({ ...form, product: e.target.value })}
          className="w-full bg-black/60 border border-white/15 px-4 py-3 mb-4 text-white focus:border-white/50"
        >
          {Object.entries(t.products.items).map(([slug, info]) => (
            <option key={slug} value={slug} className="bg-black text-white">
              {info.name}
            </option>
          ))}
        </select>

        <label className="block text-xs kicker mb-2">{t.reviews.rating}</label>
        <div className="flex items-center gap-2 mb-4" data-testid="review-rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setForm({ ...form, rating: n })}
              data-testid={`review-star-${n}`}
              className="star-btn"
              aria-label={`rate ${n}`}
            >
              <Star className={`w-7 h-7 ${n <= form.rating ? "fill-white text-white" : "text-white/25"}`} />
            </button>
          ))}
        </div>

        <label className="block text-xs kicker mb-2">{t.reviews.commentTitle}</label>
        <input
          data-testid="review-title-input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full bg-black/60 border border-white/15 px-4 py-3 mb-4 text-white placeholder-neutral-500 focus:border-white/50"
          maxLength={120}
        />

        <label className="block text-xs kicker mb-2">{t.reviews.comment}</label>
        <textarea
          data-testid="review-comment-input"
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          rows={4}
          className="w-full bg-black/60 border border-white/15 px-4 py-3 mb-6 text-white placeholder-neutral-500 focus:border-white/50 resize-none"
          required
          maxLength={1000}
        />

        <button
          type="submit"
          disabled={busy}
          data-testid="review-submit-btn"
          className="w-full bg-white text-black py-3.5 font-semibold text-sm tracking-[0.22em] uppercase hover:bg-neutral-200 disabled:opacity-50 transition-colors duration-300"
        >
          {busy ? t.reviews.submitting : t.reviews.submit}
        </button>
      </form>
    </div>
  );
}
