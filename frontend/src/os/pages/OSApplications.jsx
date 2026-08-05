import React, { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { FileText, Mail, Phone, MapPin } from "lucide-react";
import { osApi } from "../api";

const STATUS_COLOR = {
  Waiting: "border-yellow-400/40 text-yellow-400",
  Approve: "border-emerald-400/40 text-emerald-400",
  Reject: "border-red-400/40 text-red-400",
  Interview: "border-blue-400/40 text-blue-400",
  Hired: "border-purple-400/40 text-purple-400",
};

export default function OSApplications() {
  const { k } = useOutletContext();
  const [apps, setApps] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("All");

  const load = useCallback(async () => { try { const r = await osApi.get("/applications"); setApps(r.data); } catch { toast.error("Access denied"); } }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    try { await osApi.patch(`/applications/${id}`, { status }); toast.success("Updated"); load();
      if (selected?.id === id) setSelected({...selected, status });
    } catch { toast.error("Failed"); }
  };

  const shown = filter === "All" ? apps : apps.filter(a => a.status === filter);

  return (
    <div data-testid="os-applications" className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Job Applications</h1>
        <p className={`mt-1 text-sm ${k.muted}`}>طلبات التوظيف الواردة من صفحة Join Us.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["All","Waiting","Interview","Approve","Reject","Hired"].map(s => (
          <button key={s} onClick={()=>setFilter(s)} className={`text-xs px-3 py-1 rounded-md border ${filter===s?k.primary:k.ghost}`}>{s}</button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} divide-y ${k.rowBorder} max-h-[70vh] overflow-y-auto`}>
          {shown.length === 0 ? <p className={`p-8 text-center text-sm ${k.muted}`}>No applications</p> :
            shown.map(a => (
              <button key={a.id} onClick={()=>setSelected(a)} data-testid={`app-item-${a.id}`}
                className={`w-full text-start p-4 ${k.hover} ${selected?.id===a.id?k.accentSoft:''}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium">{a.name}</div>
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${STATUS_COLOR[a.status]}`}>{a.status}</span>
                </div>
                <div className={`text-xs ${k.muted}`}>{a.position} · {a.years}y · {a.city}</div>
              </button>
            ))}
        </div>
        {selected ? (
          <div className={`border rounded-xl p-5 ${k.cardBg} ${k.cardBorder} max-h-[70vh] overflow-y-auto`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">{selected.name}</h2>
                <div className={`text-sm ${k.muted}`}>{selected.position} · {selected.age}y · {selected.years}y exp</div>
              </div>
              <span className={`text-xs uppercase font-bold px-2 py-1 rounded border ${STATUS_COLOR[selected.status]}`}>{selected.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="flex items-center gap-2"><Mail className={`w-4 h-4 ${k.muted}`} />{selected.email}</div>
              <div className="flex items-center gap-2"><Phone className={`w-4 h-4 ${k.muted}`} />{selected.phone}</div>
              <div className="flex items-center gap-2"><MapPin className={`w-4 h-4 ${k.muted}`} />{selected.city}</div>
              {selected.cv_url && <a href={`${process.env.REACT_APP_BACKEND_URL}${selected.cv_url}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline"><FileText className="w-4 h-4" /> View CV</a>}
            </div>
            {selected.experiences && <Section title="Experiences" body={selected.experiences} k={k} />}
            {selected.portfolio && <Section title="Portfolio" body={selected.portfolio} k={k} />}
            {selected.socials && <Section title="Socials" body={selected.socials} k={k} />}
            {selected.message && <Section title="Message" body={selected.message} k={k} />}
            <div className="mt-4 flex flex-wrap gap-2">
              {["Waiting","Interview","Approve","Reject","Hired"].map(s => (
                <button key={s} onClick={()=>setStatus(selected.id, s)} data-testid={`set-status-${s}`}
                  className={`text-xs px-3 py-1.5 rounded-md border ${selected.status===s?k.primary:k.ghost}`}>{s}</button>
              ))}
            </div>
          </div>
        ) : <div className={`border rounded-xl p-12 text-center text-sm ${k.cardBg} ${k.cardBorder} ${k.muted}`}>Select an application</div>}
      </div>
    </div>
  );
}

function Section({ title, body, k }) {
  return <div className="mb-3">
    <div className={`text-[10px] font-mono tracking-[0.24em] uppercase mb-1 ${k.muted}`}>{title}</div>
    <div className="text-sm whitespace-pre-wrap">{body}</div>
  </div>;
}
