import React, { useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { osApi } from "../api";

export default function OSSearch() {
  const { k } = useOutletContext();
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [res, setRes] = useState(null);

  useEffect(() => { if (!q) return; osApi.get(`/search?q=${encodeURIComponent(q)}`).then(r => setRes(r.data)); }, [q]);

  return (
    <div className="space-y-6" data-testid="os-search">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Search</h1>
        <p className={`mt-1 text-sm ${k.muted}`}>Results for: <span className="font-mono">{q}</span></p>
      </div>
      {!res && <div className={`text-sm ${k.muted}`}>Searching...</div>}
      {res && Object.entries(res).map(([type, items]) => (
        <div key={type}>
          <div className={`text-[10px] font-mono tracking-[0.24em] uppercase mb-2 ${k.muted}`}>{type} ({items.length})</div>
          <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} divide-y ${k.rowBorder} overflow-hidden`}>
            {items.length === 0 ? <div className={`p-3 text-sm ${k.muted}`}>No results</div> :
              items.slice(0,10).map((x, i) => (
                <div key={i} className="p-3 text-sm">
                  <div className="font-medium">{x.name || x.title || x.filename || x.email}</div>
                  {(x.email || x.description || x.position) && <div className={`text-xs ${k.muted}`}>{x.email || x.description || x.position}</div>}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
