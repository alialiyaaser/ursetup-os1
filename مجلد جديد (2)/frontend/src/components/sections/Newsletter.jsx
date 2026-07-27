import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "../../contexts/LangContext";
import { api } from "../../lib/api";

export default function Newsletter() {
  const { t, lang } = useLang();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t.newsletter.error);
      return;
    }
    setBusy(true);
    try {
      await api.post("/newsletter", { email, language: lang });
      toast.success(t.newsletter.success);
      setEmail("");
    } catch (err) {
      toast.error(t.newsletter.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="newsletter-section" className="py-24 bg-[#090909] border-t border-white/5">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-10 md:p-14 lg:p-16">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <p className="kicker mb-3">{t.newsletter.kicker}</p>
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-white">
                {t.newsletter.title}
              </h2>
              <p className="mt-4 text-neutral-400 leading-[1.9] max-w-xl">{t.newsletter.subtitle}</p>
            </div>
            <form onSubmit={submit} className="lg:col-span-5 w-full">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 border border-white/15 bg-black/40 backdrop-blur-md p-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.newsletter.placeholder}
                  data-testid="newsletter-email"
                  required
                  className="flex-1 bg-transparent px-4 py-3 text-white placeholder-neutral-500"
                />
                <button
                  type="submit"
                  disabled={busy}
                  data-testid="newsletter-submit"
                  className="inline-flex items-center justify-center gap-2 bg-white text-black px-6 py-3 font-semibold text-sm tracking-[0.18em] uppercase hover:bg-neutral-200 disabled:opacity-50 transition-colors duration-300"
                >
                  <span>{t.newsletter.cta}</span>
                  <ArrowRight className="w-4 h-4 rtl-flip" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
