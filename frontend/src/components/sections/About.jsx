import React from "react";
import { ArrowUpRight } from "lucide-react";
import { useLang } from "../../contexts/LangContext";
import { ASSETS } from "../../i18n/translations";

export default function About() {
  const { t } = useLang();
  return (
    <section id="about" data-testid="about-section" className="py-28 lg:py-36 bg-[#0A0A0A]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 relative">
            <div className="relative">
              <div className="w-full aspect-[4/5] bg-[#0f0f0f] border border-white/10 flex items-center justify-center overflow-hidden">
                <img
                  src={ASSETS.about}
                  alt="UR SETUP studio"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute -bottom-6 start-6 bg-black border border-white/10 px-5 py-4">
                <p className="kicker">EST. 2025</p>
                <p className="font-display text-xl font-bold text-white mt-1">RIYADH · KSA</p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-7 lg:ps-8">
            <p className="kicker mb-4">{t.about.kicker}</p>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.02] tracking-tight text-white mb-8">
              {t.about.title}
            </h2>
            <p className="text-neutral-300 leading-[2] mb-5 text-lg">{t.about.p1}</p>
            <p className="text-neutral-400 leading-[2] mb-10">{t.about.p2}</p>
            <a
              href="https://salla.sa/"
              target="_blank"
              rel="noreferrer"
              data-testid="about-shop-btn"
              className="group inline-flex items-center gap-3 bg-white text-black px-7 py-3.5 rounded-full font-semibold hover:bg-neutral-200 transition-colors duration-300"
            >
              <span>{t.about.cta}</span>
              <ArrowUpRight className="w-4 h-4 rtl-flip transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
