import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Timer } from "lucide-react";
import { useLang } from "../../contexts/LangContext";
import { api } from "../../lib/api";

function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const launched = diff === 0;
  return { days, hours, minutes, seconds, launched };
}

export default function ComingSoon() {
  const { lang } = useLang();
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get("/coming-soon").then((r) => setItems(r.data || [])).catch(() => setItems([]));
  }, []);

  if (!items.length) return null;
  const item = items[0]; // featured next drop

  return (
    <section id="coming-soon" data-testid="coming-soon-section" className="relative py-28 lg:py-36 bg-[#0A0A0A] overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.16]"
        style={{
          backgroundImage: `url(${item.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(30px)",
        }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-black via-black/80 to-black" />
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 relative">
            <div className="relative overflow-hidden border border-white/10 bg-[#0f0f0f]">
              <div className="w-full aspect-[4/5] flex items-center justify-center">
                <img
                  src={item.image}
                  alt={lang === "ar" ? item.name_ar : item.name_en}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute top-4 start-4 bg-white text-black text-[10px] tracking-[0.22em] uppercase px-3 py-1.5 font-semibold">
                {lang === "ar" ? "قريبًا" : "COMING SOON"}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black via-black/60 to-transparent">
                <p className="kicker mb-1 flex items-center gap-2"><Timer className="w-3 h-3" /> {lang === "ar" ? "الإطلاق التالي" : "NEXT DROP"}</p>
                <p className="font-display text-xl font-bold text-white">{lang === "ar" ? item.name_ar : item.name_en}</p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6">
            <p className="kicker mb-4">{lang === "ar" ? "المجموعة القادمة" : "NEXT COLLECTION"}</p>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.02] tracking-tight text-white">
              {lang === "ar" ? item.name_ar : item.name_en}
            </h2>
            <p className="mt-6 text-neutral-300 leading-[1.9] max-w-xl">
              {lang === "ar" ? item.desc_ar : item.desc_en}
            </p>

            <CountdownDisplay target={item.launch_at} />

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#newsletter"
                onClick={(e) => { e.preventDefault(); document.querySelector('[data-testid="newsletter-section"]')?.scrollIntoView({ behavior: "smooth" }); }}
                data-testid="cs-notify-btn"
                className="group inline-flex items-center gap-3 bg-white text-black px-7 py-3.5 rounded-full font-semibold hover:bg-neutral-200 transition-colors duration-300"
              >
                <span>{lang === "ar" ? "أعلمني عند الإطلاق" : "Notify me on launch"}</span>
                <ArrowUpRight className="w-4 h-4 rtl-flip transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
              {items.length > 1 && (
                <p className="kicker">
                  {lang === "ar" ? `و${items.length - 1} إصدار قادم` : `+${items.length - 1} more drop${items.length - 1 === 1 ? "" : "s"} planned`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CountdownDisplay({ target }) {
  const { lang } = useLang();
  const { days, hours, minutes, seconds, launched } = useCountdown(target);
  const labels = useMemo(() => (
    lang === "ar"
      ? { d: "أيام", h: "ساعات", m: "دقائق", s: "ثواني", launched: "تم الإطلاق!" }
      : { d: "Days", h: "Hours", m: "Minutes", s: "Seconds", launched: "Launched!" }
  ), [lang]);

  if (launched) {
    return (
      <div className="mt-8 inline-flex items-center gap-3 border border-white/20 px-5 py-3 text-white">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-display font-bold tracking-widest text-sm uppercase">{labels.launched}</span>
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-4 gap-3 max-w-md" data-testid="countdown">
      <Cell value={days} label={labels.d} />
      <Cell value={hours} label={labels.h} />
      <Cell value={minutes} label={labels.m} />
      <Cell value={seconds} label={labels.s} pulse />
    </div>
  );
}

function Cell({ value, label, pulse }) {
  return (
    <div className={`bg-black/60 border border-white/10 backdrop-blur-md text-center py-4 ${pulse ? "" : ""}`}>
      <div className="font-display text-3xl md:text-4xl font-extrabold text-white tabular-nums">
        {String(value).padStart(2, "0")}
      </div>
      <p className="kicker mt-1">{label}</p>
    </div>
  );
}
