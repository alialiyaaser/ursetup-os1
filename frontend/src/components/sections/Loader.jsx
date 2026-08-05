import React, { useEffect, useState } from "react";
import { useLang } from "../../contexts/LangContext";
import { ASSETS } from "../../i18n/translations";

export default function Loader() {
  const { t } = useLang();
  const [hide, setHide] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const a = setTimeout(() => setHide(true), 1500);
    const b = setTimeout(() => setGone(true), 2400);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  if (gone) return null;

  return (
    <div
      data-testid="loader"
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#0A0A0A] transition-opacity duration-700 ${hide ? "opacity-0 pointer-events-none" : "opacity-100"}`}
    >
      <div className="text-center">
        <img src={ASSETS.logo} alt="UR SETUP" className="w-20 mx-auto mb-6 animate-float" />
        <h1 className="font-display text-3xl md:text-4xl tracking-[0.3em] font-extrabold text-white">
          {t.loader.title}
        </h1>
        <p className="mt-3 text-sm text-neutral-400">{t.loader.sub}</p>
        <div className="mt-8 mx-auto w-56 h-[3px] bg-neutral-900 rounded-full overflow-hidden">
          <span className="block h-full bg-white loader-bar" />
        </div>
      </div>
      <style>{`
        .loader-bar { width: 0%; animation: loaderBar 1.4s ease forwards; }
        @keyframes loaderBar { to { width: 100%; } }
      `}</style>
    </div>
  );
}
