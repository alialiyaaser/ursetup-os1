import React from "react";
import { Instagram, Music2, Store } from "lucide-react";
import { useLang } from "../../contexts/LangContext";
import { ASSETS } from "../../i18n/translations";

export default function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();
  return (
    <footer data-testid="site-footer" className="pt-20 pb-10 bg-black border-t border-white/10">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-10 pb-14 border-b border-white/10">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3 mb-5">
              <img src={ASSETS.logo} alt="UR SETUP" className="w-12 h-12" />
              <span className="font-display font-extrabold tracking-[0.22em]">UR SETUP</span>
            </div>
            <p className="text-neutral-400 leading-[1.9] max-w-md">{t.footer.tagline}</p>
            <p className="mt-4 text-neutral-500 text-sm">{t.footer.craft}</p>
          </div>
          <div className="lg:col-span-4">
            <p className="kicker mb-4">{t.footer.links}</p>
            <ul className="space-y-3 text-sm">
              {["home", "products", "about", "reviews", "faq", "contact"].map((k) => (
                <li key={k}>
                  <a href={`#${k}`} className="text-neutral-400 hover:text-white transition-colors duration-300">
                    {t.nav[k]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-3">
            <p className="kicker mb-4">{t.footer.social}</p>
            <div className="flex gap-3">
              <a href="https://www.instagram.com/ur.setup" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center hover:bg-white hover:text-black transition-colors duration-300" aria-label="Instagram">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://www.tiktok.com/@ur.setup" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center hover:bg-white hover:text-black transition-colors duration-300" aria-label="TikTok">
                <Music2 className="w-4 h-4" />
              </a>
              <a href="https://salla.sa/" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center hover:bg-white hover:text-black transition-colors duration-300" aria-label="Store">
                <Store className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <p>{t.footer.legal.replace("{year}", year)}</p>
          <p className="font-mono">UR SETUP · V2.0</p>
        </div>
      </div>
    </footer>
  );
}
