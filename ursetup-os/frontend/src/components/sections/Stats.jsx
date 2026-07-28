import React, { useEffect, useRef, useState } from "react";
import { useLang } from "../../contexts/LangContext";
import { api } from "../../lib/api";

function useCounter(target, active) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf;
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else setVal(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active]);
  return val;
}

export default function Stats() {
  const { t } = useLang();
  const [data, setData] = useState({ customers: 250, orders: 500, average_rating: 4.9 });
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    api.get("/stats")
  .then((r) =>
    setData({
      customers: r.data.customers ?? 250,
      orders: r.data.orders ?? 500,
      average_rating: r.data.average_rating ?? 4.9,
    })
  )
  .catch(() => {});
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setInView(true)),
      { threshold: 0.2 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const c = useCounter(data.customers, inView);
  const o = useCounter(data.orders, inView);

  return (
    <section ref={ref} data-testid="stats-section" className="py-24 bg-[#0A0A0A]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-white/10 divide-y lg:divide-y-0 lg:divide-x rtl:lg:divide-x-reverse divide-white/10">
          <StatCell value={`${c}+`} label={t.stats.customers} />
          <StatCell value={`${o}+`} label={t.stats.orders} />
          <StatCell value={`${(data.average_rating || 4.9).toFixed(1)}★`} label={t.stats.rating} />
          <StatCell value={"100%"} label={t.stats.secure} />
        </div>
      </div>
    </section>
  );
}

function StatCell({ value, label }) {
  return (
    <div className="py-10 md:py-14 px-6 md:px-10 text-center">
      <div className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-2 tracking-tight">
        {value}
      </div>
      <p className="kicker">{label}</p>
    </div>
  );
}
