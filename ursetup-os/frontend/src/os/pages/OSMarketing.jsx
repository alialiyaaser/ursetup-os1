import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import AdminReviews from "../../admin/pages/AdminReviews";
import AdminPromo from "../../admin/pages/AdminPromo";
import AdminNewsletter from "../../admin/pages/AdminNewsletter";

export default function OSMarketing() {
  const ctx = useOutletContext();
  const { t, k } = ctx;
  const [tab, setTab] = useState("reviews");

  const tabs = [
    { key: "reviews", label: t.marketing.tabs_reviews },
    { key: "promo", label: t.marketing.tabs_promo },
    { key: "newsletter", label: t.marketing.tabs_newsletter },
  ];

  return (
    <div data-testid="os-marketing" className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.marketing.title}</h1>
        <p className={`mt-1 text-sm ${k.muted}`}>{t.marketing.subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)} data-testid={`marketing-tab-${tb.key}`}
            className={`px-4 py-2 text-sm rounded-md border transition-colors duration-200 ${tab === tb.key ? k.primary : k.ghost}`}>
            {tb.label}
          </button>
        ))}
      </div>

      <div className={`${k.dark ? "" : "os-admin-light"}`}>
        {tab === "reviews" && <AdminReviews />}
        {tab === "promo" && <AdminPromo />}
        {tab === "newsletter" && <AdminNewsletter />}
      </div>
    </div>
  );
}
