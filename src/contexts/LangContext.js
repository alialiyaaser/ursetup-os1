import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { translations } from "../i18n/translations";

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const initial = (() => {
    try {
      const saved = localStorage.getItem("ur_lang");
      if (saved === "ar" || saved === "en") return saved;
    } catch (err) {
      console.warn("[LangProvider] Unable to read language from localStorage:", err);
    }
    const nav = typeof navigator !== "undefined" ? navigator.language || "" : "";
    return nav.toLowerCase().startsWith("ar") ? "ar" : "en";
  })();

  const [lang, setLang] = useState(initial);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", dir);
    try {
      localStorage.setItem("ur_lang", lang);
    } catch (err) {
      console.warn("[LangProvider] Unable to persist language:", err);
    }
  }, [lang]);

  const value = useMemo(() => {
    const t = translations[lang];
    return {
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      t,
      toggle: () => setLang((l) => (l === "en" ? "ar" : "en")),
      set: setLang,
    };
  }, [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
