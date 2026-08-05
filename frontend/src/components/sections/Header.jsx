import React, { useEffect, useState } from "react";
import { Menu, X, Globe } from "lucide-react";
import { useLang } from "../../contexts/LangContext";
import { ASSETS } from "../../i18n/translations";

export default function Header() {
  const { t, toggle } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = [
    { key: "products", href: "#products" },
    { key: "about", href: "#about" },
    { key: "reviews", href: "#reviews" },
    { key: "faq", href: "#faq" },
    { key: "contact", href: "#contact" },
  ];

  return (
    <header
      data-testid="site-header"
      className={`fixed top-0 inset-x-0 z-50 transition-[background,backdrop-filter,border] duration-300 ${
        scrolled ? "bg-black/70 backdrop-blur-xl border-b border-white/10" : "bg-transparent"
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="h-20 flex items-center justify-between gap-6">
          <a href="#home" data-testid="brand-logo" className="flex items-center gap-3 group">
            <img src={ASSETS.logo} alt="UR SETUP" className="w-10 h-10 transition-transform duration-500 group-hover:scale-110" />
            <span className="font-display font-extrabold tracking-[0.22em] text-sm md:text-base">
              UR SETUP
            </span>
          </a>

          <nav className="hidden lg:flex items-center gap-9">
            {nav.map((n) => (
              <a
                key={n.key}
                href={n.href}
                data-testid={`nav-${n.key}`}
                className="text-[13px] tracking-[0.18em] uppercase text-neutral-400 hover:text-white transition-colors duration-300"
              >
                {t.nav[n.key]}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              data-testid="lang-toggle"
              aria-label="Toggle language"
              className="flex items-center gap-2 border border-white/15 text-white text-xs tracking-[0.18em] uppercase px-3.5 py-2 rounded-full hover:bg-white hover:text-black transition-colors duration-300"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="font-mono">{t.lang.toggle}</span>
            </button>
            <a
              href="https://salla.sa/"
              target="_blank"
              rel="noreferrer"
              data-testid="header-shop-btn"
              className="hidden md:inline-flex text-xs tracking-[0.18em] uppercase bg-white text-black px-5 py-2.5 rounded-full font-semibold hover:bg-neutral-200 transition-colors duration-300"
            >
              {t.nav.shop}
            </a>
            <button
              onClick={() => setOpen((o) => !o)}
              className="lg:hidden text-white"
              aria-label="Menu"
              data-testid="mobile-menu-toggle"
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`lg:hidden overflow-hidden bg-black/95 backdrop-blur-xl border-b border-white/10 transition-[max-height,opacity] duration-500 ${
          open ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-6 py-6 flex flex-col gap-4">
          {nav.map((n) => (
            <a
              key={n.key}
              href={n.href}
              onClick={() => setOpen(false)}
              data-testid={`mnav-${n.key}`}
              className="text-sm tracking-[0.18em] uppercase text-neutral-300 hover:text-white"
            >
              {t.nav[n.key]}
            </a>
          ))}
          <a
            href="https://salla.sa/"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center justify-center bg-white text-black text-sm tracking-[0.18em] uppercase px-5 py-3 rounded-full font-semibold"
          >
            {t.nav.shop}
          </a>
        </div>
      </div>
    </header>
  );
}
