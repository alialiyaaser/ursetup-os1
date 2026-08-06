import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { osApi } from "./api";

const TYPE_ROUTE = {
  users: (x) => `/os/employees`,
  tasks: (x) => `/os/tasks`,
  applications: (x) => `/os/applications`,
  events: (x) => `/os/calendar`,
  files: (x) => `/os/files`,
};

const NAV_PAGES = [
  { keys: ["dashboard","home","الرئيسية"], to: "/os", label: "Dashboard" },
  { keys: ["hr","الموارد","حضور","اجازات","رواتب"], to: "/os/hr", label: "HR" },
  { keys: ["tasks","مهام","مهمة"], to: "/os/tasks", label: "Tasks" },
  { keys: ["calendar","تقويم","اجتماع"], to: "/os/calendar", label: "Calendar" },
  { keys: ["chat","دردشة","محادثة"], to: "/os/chat", label: "Team Chat" },
  { keys: ["social","سوشيال","انستقرام","تيك"], to: "/os/social", label: "Social Media" },
  { keys: ["files","ملفات","مكتبة"], to: "/os/files", label: "Files" },
  { keys: ["applications","توظيف","طلبات"], to: "/os/applications", label: "Applications" },
  { keys: ["employees","موظف","الموظفين","رتب"], to: "/os/employees", label: "Employees" },
  { keys: ["analytics","تحليل","إحصائيات","تقارير"], to: "/os/analytics", label: "Analytics" },
  { keys: ["logs","سجل","نشاط"], to: "/os/logs", label: "Activity Logs" },
  { keys: ["settings","إعدادات","اعدادات"], to: "/os/settings", label: "Settings" },
  { keys: ["notifications","اشعار","إشعار"], to: "/os/notifications", label: "Notifications" },
  { keys: ["marketing","تسويق"], to: "/os/marketing", label: "Marketing" },
  { keys: ["support","دعم"], to: "/os/support", label: "Support" },
  { keys: ["products","منتج"], to: "/os/products", label: "Products" },
];

export default function GlobalSearchBar({ k, lang }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!q.trim()) { setResults(null); return; }
    const ql = q.toLowerCase();
    const pageMatches = NAV_PAGES.filter(p => p.keys.some(k => k.includes(ql) || ql.includes(k)) || p.label.toLowerCase().includes(ql)).slice(0, 5);
    setResults({ pages: pageMatches, entities: null });
    // Deep search after 300ms
    const t = setTimeout(() => {
      osApi.get(`/search?q=${encodeURIComponent(q.trim())}`).then(r => {
        setResults({ pages: pageMatches, entities: r.data });
      }).catch(()=>{});
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const goTo = (path) => { setOpen(false); setQ(""); nav(path); };

  const totalEntities = results?.entities ? Object.values(results.entities).reduce((n, arr) => n + arr.length, 0) : 0;

  return (
    <div ref={boxRef} className="relative w-full max-w-md" data-testid="global-search-container">
      <form onSubmit={(e)=>{ e.preventDefault(); if(q.trim()) goTo(`/os/search?q=${encodeURIComponent(q.trim())}`); }}>
        <div className="relative">
          <Search className={`absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${k.muted}`} />
          <input value={q} onChange={(e)=>{ setQ(e.target.value); setOpen(true); }} onFocus={()=>setOpen(true)}
            placeholder={lang === "ar" ? "بحث سريع (اكتب اسم الصفحة أو أي شيء)..." : "Quick search (type page or anything)..."}
            data-testid="os-global-search"
            className={`w-full ps-8 pe-3 py-1.5 rounded-md border text-sm ${k.input}`} />
        </div>
      </form>
      {open && q && results && (
        <div className={`absolute top-full mt-1 start-0 end-0 z-50 border rounded-md shadow-2xl ${k.cardBg} ${k.cardBorder} max-h-96 overflow-y-auto`}>
          {results.pages.length > 0 && (
            <div>
              <div className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest ${k.muted}`}>Pages</div>
              {results.pages.map(p => (
                <button key={p.to} onClick={()=>goTo(p.to)} data-testid={`search-page-${p.label}`}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm ${k.hover}`}>
                  <span>{p.label}</span>
                  <ArrowRight className={`w-3.5 h-3.5 ${k.muted}`} />
                </button>
              ))}
            </div>
          )}
          {results.entities && totalEntities > 0 && (
            <div className={`border-t ${k.rowBorder}`}>
              {Object.entries(results.entities).map(([type, items]) => items.length > 0 && (
                <div key={type}>
                  <div className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest ${k.muted}`}>{type} ({items.length})</div>
                  {items.slice(0, 3).map((x, i) => (
                    <button key={i} onClick={()=>goTo(TYPE_ROUTE[type] ? TYPE_ROUTE[type](x) : "/os/search")}
                      data-testid={`search-result-${type}-${i}`}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm ${k.hover}`}>
                      <span className="truncate">{x.name || x.title || x.filename || x.email}</span>
                      <ArrowRight className={`w-3.5 h-3.5 ${k.muted}`} />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
          {results.pages.length === 0 && totalEntities === 0 && (
            <div className={`p-4 text-sm text-center ${k.muted}`}>{lang === "ar" ? "لا نتائج — اضغط Enter للبحث الشامل" : "No results — press Enter for full search"}</div>
          )}
        </div>
      )}
    </div>
  );
}
