import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import AdminComingSoon from "../../admin/pages/AdminComingSoon";

export default function OSProducts() {
  const { t, k } = useOutletContext();
  const [tab, setTab] = useState("coming");

  return (
    <div data-testid="os-products" className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.products.title}</h1>
        <p className={`mt-1 text-sm ${k.muted}`}>{t.products.subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab("coming")} data-testid="products-tab-coming"
          className={`px-4 py-2 text-sm rounded-md border transition-colors duration-200 ${tab === "coming" ? k.primary : k.ghost}`}>
          {t.products.tabs_coming}
        </button>
      </div>

      {tab === "coming" && <AdminComingSoon />}
    </div>
  );
}
