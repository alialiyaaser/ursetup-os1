import React from "react";
import { Truck, Sparkles, Lock, MessageCircle } from "lucide-react";
import { useLang } from "../../contexts/LangContext";

const icons = [Truck, Sparkles, Lock, MessageCircle];

export default function WhyUs() {
  const { t } = useLang();
  return (
    <section id="why" data-testid="why-section" className="py-28 lg:py-36 bg-[#090909] border-y border-white/5">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <div className="max-w-2xl mb-14">
          <p className="kicker mb-4">{t.why.kicker}</p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.02] tracking-tight text-white">
            {t.why.title}
          </h2>
        </div>

        {/* Clean bento — no background images */}
        <div className="grid md:grid-cols-2 lg:grid-cols-12 gap-5 lg:gap-6">
          {t.why.items.map((it, i) => {
            const Icon = icons[i];
            const spanClass = [
              "lg:col-span-7",
              "lg:col-span-5",
              "lg:col-span-5",
              "lg:col-span-7",
            ][i];
            return (
              <article
                key={it.t}
                data-testid={`why-card-${i}`}
                className={`${spanClass} group relative overflow-hidden bg-[#0f0f0f] border border-white/10 hover:border-white/25 min-h-[240px] lg:min-h-[280px] transition-colors duration-500`}
              >
                {/* Subtle radial light from icon corner */}
                <div
                  aria-hidden
                  className="absolute -top-24 -end-24 w-64 h-64 rounded-full opacity-40 group-hover:opacity-60 transition-opacity duration-700"
                  style={{
                    background: "radial-gradient(circle at center, rgba(255,255,255,0.08), transparent 70%)",
                  }}
                />
                <div className="relative h-full p-8 lg:p-10 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-6">
                    <p className="kicker font-mono">{String(i + 1).padStart(2, "0")}</p>
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors duration-500">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">{it.t}</h3>
                    <p className="text-neutral-400 leading-[1.9] max-w-md text-sm md:text-base">{it.d}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
