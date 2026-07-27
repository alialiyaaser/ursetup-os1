import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLang } from "../../contexts/LangContext";
import { api } from "../../lib/api";

export default function PromoBanner() {
  const { lang } = useLang();
  const [data, setData] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const d = sessionStorage.getItem("ur_promo_dismissed");
      if (d === "1") setDismissed(true);
    } catch (err) {
      console.warn("[PromoBanner] sessionStorage unavailable:", err);
    }
    api
      .get("/promo-banner")
      .then((r) => setData(r.data))
      .catch((err) => console.warn("[PromoBanner] failed to load banner:", err));
  }, []);

  if (!data || !data.active || dismissed) return null;
  const text = lang === "ar" ? data.text_ar : data.text_en;
  if (!text) return null;

  return (
    <div
      data-testid="promo-banner"
      className="relative z-[60] bg-white text-black overflow-hidden"
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-2.5 flex items-center justify-between gap-4">
        {data.link ? (
          <a href={data.link} className="flex-1 text-center text-[13px] tracking-[0.14em] uppercase font-medium truncate">
            {text}
          </a>
        ) : (
          <p className="flex-1 text-center text-[13px] tracking-[0.14em] uppercase font-medium truncate">{text}</p>
        )}
        <button
          onClick={() => {
            setDismissed(true);
            try { sessionStorage.setItem("ur_promo_dismissed", "1"); }
            catch (err) { console.warn("[PromoBanner] cannot persist dismissal:", err); }
          }}
          aria-label="close"
          data-testid="promo-close"
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity duration-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
