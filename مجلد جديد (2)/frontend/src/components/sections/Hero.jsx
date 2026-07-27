import React from "react";
import { ArrowUpRight, ArrowDown } from "lucide-react";
import { useLang } from "../../contexts/LangContext";
import { ASSETS } from "../../i18n/translations";

export default function Hero() {
  const { t, lang } = useLang();
  const items = t.hero.marqueeItems.concat(t.hero.marqueeItems);

  return (
    <section id="home" data-testid="hero-section" className="relative min-h-[100svh] pt-28 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
      {/* Cinematic marble backdrop */}
      <div className="absolute inset-0 -z-10">
        <img
          src={ASSETS.heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-[#0A0A0A]" />
      </div>

      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 relative">
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-block w-8 h-px bg-white/40" />
              <span className="kicker" data-testid="hero-kicker">{t.hero.kicker}</span>
            </div>

            <h1 className="font-display font-extrabold text-white leading-[0.92] tracking-tightest text-[64px] sm:text-[84px] md:text-[104px] lg:text-[128px]">
              <span className="block">{t.hero.title1}</span>
              <span className="block relative">
                {t.hero.title2}
                <span className="absolute -bottom-2 start-0 h-[6px] w-24 bg-white/80" />
              </span>
            </h1>

            <p className="mt-8 max-w-[560px] text-neutral-300 text-lg leading-[1.9]">
              {t.hero.subtitle}
            </p>

            <div className="mt-10 flex flex-wrap gap-4 items-center">
              <a
                href="https://salla.sa/"
                target="_blank"
                rel="noreferrer"
                data-testid="hero-shop-btn"
                className="group inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-semibold hover:bg-neutral-200 transition-colors duration-300"
              >
                <span>{t.hero.shop}</span>
                <ArrowUpRight className="w-4 h-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl-flip" />
              </a>
              <a
                href="#products"
                data-testid="hero-explore-btn"
                className="group inline-flex items-center gap-3 border border-white/25 px-8 py-4 rounded-full font-medium hover:bg-white/10 transition-colors duration-300"
              >
                <span>{t.hero.explore}</span>
                <ArrowDown className="w-4 h-4 transition-transform duration-500 group-hover:translate-y-0.5" />
              </a>
            </div>

            {/* Vertical stat rail */}
            <div className="hidden lg:flex gap-8 mt-14">
              <Stat kicker="04.9" label={t.stats.rating} />
              <div className="w-px h-10 bg-white/10 self-center" />
              <Stat kicker="500+" label={t.stats.customers} />
              <div className="w-px h-10 bg-white/10 self-center" />
              <Stat kicker="04" label={lang === "ar" ? "قِطع" : "Artifacts"} />
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-6 rounded-[36px] border border-white/10 pointer-events-none" />
              <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              <div className="relative rounded-[24px] bg-[#0f0f0f] border border-white/5 w-full aspect-square flex items-center justify-center overflow-hidden">
                <img
                  src={ASSETS.hero}
                  alt="UR SETUP mousepad"
                  className="w-[92%] h-[92%] object-contain animate-float"
                />
              </div>
              <div className="absolute -bottom-4 -end-4 bg-black border border-white/10 px-4 py-3 rounded-2xl">
                <p className="kicker mb-1">{lang === "ar" ? "الطراز" : "MODEL"}</p>
                <p className="font-display font-bold text-white text-sm">GREY MARBLE · 01</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Marquee band */}
      <div className="mt-16 lg:mt-24 border-y border-white/10 py-5 overflow-hidden marquee-mask">
        <div className={`flex gap-14 whitespace-nowrap ${lang === "ar" ? "animate-marquee-rtl" : "animate-marquee"}`}>
          {items.map((it, i) => (
            <span key={`${it}-${i}`} className="flex items-center gap-14 text-white/70">
              <span className="font-display font-bold tracking-widest uppercase text-lg md:text-xl">
                {it}
              </span>
              <span className="text-white/30">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ kicker, label }) {
  return (
    <div>
      <div className="font-display text-3xl font-extrabold text-white">{kicker}</div>
      <div className="kicker mt-1">{label}</div>
    </div>
  );
}
