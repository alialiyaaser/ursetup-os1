import React from "react";
import { useOutletContext } from "react-router-dom";
import { Rocket } from "lucide-react";

export default function OSComingSoon({ moduleKey, extraHint }) {
  const { t, k } = useOutletContext();
  const label = t.nav[moduleKey] || moduleKey;

  return (
    <div data-testid={`os-coming-${moduleKey}`} className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{label}</h1>
        <p className={`mt-1 text-sm ${k.muted}`}>{t.coming.subtitle}</p>
      </div>
      <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} p-14 flex flex-col items-center justify-center text-center`}>
        <div className={`w-14 h-14 rounded-2xl ${k.accentSoft} flex items-center justify-center mb-4`}>
          <Rocket className="w-6 h-6" />
        </div>
        <p className="text-lg font-medium mb-1">{t.coming.title}</p>
        <p className={`text-sm max-w-md ${k.muted}`}>{extraHint || t.coming.subtitle}</p>
      </div>
    </div>
  );
}
