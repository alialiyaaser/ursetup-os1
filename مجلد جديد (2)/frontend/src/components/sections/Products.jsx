import React, { useState } from "react";
import { ArrowUpRight, X, Plus } from "lucide-react";
import { useLang } from "../../contexts/LangContext";
import { PRODUCTS } from "../../i18n/translations";

export default function Products() {
const { t } = useLang();
  const [detail, setDetail] = useState(null);

  return (
    <section id="products" data-testid="products-section" className="relative py-28 lg:py-36 bg-[#0A0A0A]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16 lg:mb-20">
          <div className="max-w-2xl">
            <p className="kicker mb-4" data-testid="products-kicker">{t.products.kicker}</p>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.02] tracking-tight text-white">
              {t.products.title}
            </h2>
          </div>
          <p className="text-neutral-400 text-base leading-[1.9] max-w-md">
            {t.products.subtitle}
          </p>
        </div>

        {/* Immersive bento grid: big feature card + two stacked */}
        <div className="grid lg:grid-cols-12 gap-5 lg:gap-6">
          {/* Feature card - taller */}
          <ProductCard
            product={PRODUCTS[0]}
            info={t.products.items[PRODUCTS[0].slug]}
            t={t}
            index={0}
            className="lg:col-span-7 min-h-[520px] lg:min-h-[720px]"
            onView={() => setDetail(PRODUCTS[0].slug)}
            large
          />
          <div className="lg:col-span-5 grid gap-5 lg:gap-6">
            <ProductCard
              product={PRODUCTS[1]}
              info={t.products.items[PRODUCTS[1].slug]}
              t={t}
              index={1}
              className="min-h-[300px] lg:min-h-[348px]"
              onView={() => setDetail(PRODUCTS[1].slug)}
            />
            <ProductCard
              product={PRODUCTS[2]}
              info={t.products.items[PRODUCTS[2].slug]}
              t={t}
              index={2}
              className="min-h-[300px] lg:min-h-[348px]"
              onView={() => setDetail(PRODUCTS[2].slug)}
            />
          </div>
        </div>
      </div>

      {detail && <ProductModal slug={detail} onClose={() => setDetail(null)} />}
    </section>
  );
}

function ProductCard({ product: p, info, t, index, className = "", large = false, onView }) {
  return (
    <article
      data-testid={`product-${p.slug}`}
      className={`group relative overflow-hidden bg-[#0f0f0f] ${className}`}
    >
      {/* Cinematic background */}
      <img
        src={p.img}
        alt={info.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
      />
      {/* Grain + dark scrim for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
      <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      }} />

      {/* Top badges */}
      <div className="absolute top-5 start-5 flex flex-col gap-2">
        <span className="text-[10px] tracking-[0.22em] uppercase bg-white text-black px-2.5 py-1 font-semibold w-fit">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-[10px] tracking-[0.22em] uppercase bg-black/50 backdrop-blur-md border border-white/15 text-white px-2.5 py-1 w-fit">
          {info.tag}
        </span>
      </div>
      <div className="absolute top-5 end-5">
        <button
          onClick={onView}
          data-testid={`product-quickview-${p.slug}`}
          aria-label="quick view"
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors duration-300"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-6 lg:p-8 flex items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="kicker mb-2 opacity-80">UR SETUP · MARBLE</p>
          <h3 className={`font-display font-bold text-white ${large ? "text-3xl lg:text-5xl" : "text-2xl"} leading-[1.05]`}>
            {info.name}
          </h3>
          {large && (
            <p className="mt-3 text-neutral-200/90 text-sm max-w-sm leading-[1.7] line-clamp-2">
              {info.desc}
            </p>
          )}
          <p className="mt-3 font-mono text-white/80 text-xs">{p.price}</p>
        </div>
        <a
          href={p.storeUrl}
          target="_blank"
          rel="noreferrer"
          data-testid={`product-cta-${p.slug}`}
          className="shrink-0 group/btn inline-flex items-center gap-2 bg-white text-black px-5 py-3 text-[11px] tracking-[0.22em] uppercase font-semibold hover:bg-neutral-200 transition-colors duration-300"
        >
          <span>{t.products.cta}</span>
          <ArrowUpRight className="w-3.5 h-3.5 rtl-flip transition-transform duration-500 group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
        </a>
      </div>
    </article>
  );
}

function ProductModal({ slug, onClose }) {
  const { t } = useLang();
  const p = PRODUCTS.find((x) => x.slug === slug);
  const item = t.products.items[slug];
  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-md flex items-center justify-center px-4 py-8 animate-fadeUp"
      onClick={onClose}
      data-testid="product-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl w-full bg-[#0d0d0d] border border-white/10 grid md:grid-cols-2 max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          data-testid="product-modal-close"
          className="absolute top-3 end-3 z-10 w-10 h-10 rounded-full bg-black/70 border border-white/15 flex items-center justify-center hover:bg-white hover:text-black transition-colors duration-300"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="relative aspect-square md:aspect-auto">
          <img src={p.img} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <div className="p-8 md:p-10">
          <p className="kicker mb-3">{item.tag} · UR SETUP</p>
          <h3 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">{item.name}</h3>
          <p className="text-neutral-400 leading-[1.9] mb-6">{item.desc}</p>
          <div className="border-t border-white/10">
            {Array.isArray(t.products.specs) && t.products.specs.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-3.5 border-b border-white/10 text-sm">
                <span className="text-neutral-500 uppercase tracking-[0.18em] text-xs">{k}</span>
                <span className="text-white">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center gap-4">
            <span className="font-mono text-sm text-white">{p.price}</span>
            <a
              href={p.storeUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-black px-5 py-3 text-xs tracking-[0.22em] uppercase font-semibold hover:bg-neutral-200 transition-colors duration-300"
            >
              <span>{t.products.cta}</span>
              <ArrowUpRight className="w-3.5 h-3.5 rtl-flip" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
