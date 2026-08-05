import React from "react";
import { useLang } from "../../contexts/LangContext";
import { ASSETS } from "../../i18n/translations";

const SETUPS = [
  {
    img: ASSETS.setup1,
    name: "@yzr.setup",
    loc: "Riyadh, KSA",
    text: "UR SETUP redefined my desk. It looks straight out of a magazine.",
  },
  {
    img: ASSETS.setup2,
    name: "@nightowl",
    loc: "Dubai, UAE",
    text: "The dark marble is unreal in low light. My stream chat cannot stop asking about it.",
  },
  {
    img: ASSETS.setup1,
    name: "@marcus.plays",
    loc: "Berlin, DE",
    text: "Shipped fast, packaged like a luxury unboxing. 10/10.",
  },
];

export default function Testimonials() {
  const { t } = useLang();
  return (
    <section data-testid="testimonials-section" className="py-28 lg:py-36 bg-[#090909]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="max-w-2xl mb-14">
          <p className="kicker mb-4">{t.testimonials.kicker}</p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.02] tracking-tight text-white">
            {t.testimonials.title}
          </h2>
          <p className="mt-6 text-neutral-400 leading-[1.9]">{t.testimonials.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {SETUPS.map((s, i) => (
            <figure key={s.name} className="group relative overflow-hidden bg-[#0f0f0f] border border-white/10" data-testid={`testimonial-${i}`}>
              <div className="aspect-[4/5] overflow-hidden">
                <img src={s.img} alt="" className="w-full h-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.05]" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black via-black/70 to-transparent">
                <blockquote className="text-white text-sm leading-[1.7] mb-4">"{s.text}"</blockquote>
                <div className="flex items-center justify-between">
                  <p className="font-display font-bold text-white text-sm">{s.name}</p>
                  <p className="kicker">{s.loc}</p>
                </div>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
