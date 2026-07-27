import React from "react";
import { Instagram, Music2, Store, ArrowUpRight } from "lucide-react";
import { useLang } from "../../contexts/LangContext";

export default function Contact() {
  const { t } = useLang();
  const items = [
    { label: "Instagram", href: "https://www.instagram.com/ur.setup", Icon: Instagram, handle: "@ur.setup" },
    { label: "TikTok", href: "https://www.tiktok.com/@ur.setup", Icon: Music2, handle: "@ur.setup" },
    { label: "Store SOON", href: "https://www.ursetup.store/", Icon: Store, handle: "ursetup.store" },
  ];
  return (
    <section id="contact" data-testid="contact-section" className="py-28 lg:py-36 bg-[#090909]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="max-w-2xl mb-14">
          <p className="kicker mb-4">{t.contact.kicker}</p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.02] tracking-tight text-white">
            {t.contact.title}
          </h2>
          <p className="mt-6 text-neutral-400 leading-[1.9]">{t.contact.subtitle}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {items.map((it) => (
            <a
              key={it.label}
              href={it.href}
              target="_blank"
              rel="noreferrer"
              data-testid={`contact-${it.label.toLowerCase().replace(" ", "-")}`}
              className="group border border-white/10 bg-[#0f0f0f] p-8 flex items-center justify-between hover:border-white/25 hover:bg-white hover:text-black transition-colors duration-500"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl border border-white/15 flex items-center justify-center mb-5 group-hover:border-black/20 transition-colors duration-500">
                  <it.Icon className="w-5 h-5" />
                </div>
                <p className="font-display text-2xl font-bold">{it.label}</p>
                <p className="text-neutral-400 text-sm mt-1 group-hover:text-black/70 transition-colors duration-500">{it.handle}</p>
              </div>
              <ArrowUpRight className="w-6 h-6 rtl-flip transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
