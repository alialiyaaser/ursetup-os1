import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { useLang } from "../../contexts/LangContext";

export default function FAQ() {
  const { t } = useLang();
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" data-testid="faq-section" className="py-28 lg:py-36 bg-[#0A0A0A]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-14">
          <div className="lg:col-span-4">
            <p className="kicker mb-4">{t.faq.kicker}</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold leading-[1.05] tracking-tight text-white">
              {t.faq.title}
            </h2>
          </div>
          <div className="lg:col-span-8">
            <div className="border-t border-white/10">
              {t.faq.items.map((it, i) => {
                const isOpen = open === i;
                return (
                  <div key={it.q} className="border-b border-white/10" data-testid={`faq-item-${i}`}>
                    <button
                      className="w-full flex items-center justify-between py-6 gap-6 text-start hover:text-white"
                      onClick={() => setOpen(isOpen ? -1 : i)}
                      data-testid={`faq-toggle-${i}`}
                    >
                      <span className="font-display font-bold text-lg md:text-xl text-white">{it.q}</span>
                      <span className="shrink-0 w-9 h-9 rounded-full border border-white/15 flex items-center justify-center">
                        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </span>
                    </button>
                    <div
                      className={`grid transition-all duration-500 ${isOpen ? "grid-rows-[1fr] opacity-100 pb-6" : "grid-rows-[0fr] opacity-0"}`}
                    >
                      <div className="overflow-hidden">
                        <p className="text-neutral-400 leading-[1.9] max-w-2xl">{it.a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
