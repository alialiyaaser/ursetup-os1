import React, { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Calendar as CalIcon } from "lucide-react";
import { osApi } from "../api";
import { toast } from "sonner";

const TYPE_COLOR = {
  meeting: "border-blue-400/40 text-blue-400",
  campaign: "border-purple-400/40 text-purple-400",
  holiday: "border-orange-400/40 text-orange-400",
  launch: "border-emerald-400/40 text-emerald-400",
};

export default function OSCalendar() {
  const { t, k } = useOutletContext();
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", date: "", type: "meeting" });
  const [show, setShow] = useState(false);
  const load = useCallback(() => osApi.get("/events").then(r => setEvents(r.data)).catch(()=>{}), []);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    try { await osApi.post("/events", { ...form, attendees: [] }); toast.success(t.common.created); setShow(false); setForm({title:"",description:"",date:"",type:"meeting"}); load(); }
    catch { toast.error(t.common.failed); }
  };

  const remove = async (id) => { await osApi.delete(`/events/${id}`); load(); };
  const grouped = events.reduce((acc, e) => { const key = (e.date||"").slice(0,7); (acc[key]=acc[key]||[]).push(e); return acc; }, {});

  return (
    <div data-testid="os-calendar" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Calendar</h1>
          <p className={`mt-1 text-sm ${k.muted}`}>اجتماعات، حملات، إجازات، وإطلاق منتجات.</p>
        </div>
        <button onClick={()=>setShow(!show)} data-testid="new-event-btn" className={`${k.primary} rounded-md px-4 py-2 text-sm inline-flex items-center gap-2`}>
          <Plus className="w-4 h-4" /> New event
        </button>
      </div>

      {show && <form onSubmit={create} className={`border rounded-xl p-5 ${k.cardBg} ${k.cardBorder} grid md:grid-cols-2 gap-3`}>
        <input required placeholder="Title" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} data-testid="event-title" className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
        <input required type="date" value={form.date} onChange={(e)=>setForm({...form,date:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
        <select value={form.type} onChange={(e)=>setForm({...form,type:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`}>
          {Object.keys(TYPE_COLOR).map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <textarea placeholder="Description" rows={2} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
        <button type="submit" className={`${k.primary} rounded-md py-2 text-sm md:col-span-2`}>Create</button>
      </form>}

      {Object.keys(grouped).length === 0 ? (
        <div className={`border rounded-xl p-12 text-center ${k.cardBg} ${k.cardBorder}`}>
          <CalIcon className={`w-10 h-10 mx-auto mb-3 ${k.muted}`} />
          <p className="font-semibold">No events yet</p>
          <p className={`text-sm ${k.muted}`}>Schedule your first event to see it here.</p>
        </div>
      ) : Object.entries(grouped).sort().map(([month, items]) => (
        <div key={month}>
          <div className={`text-[10px] font-mono tracking-[0.24em] uppercase mb-2 ${k.muted}`}>{month}</div>
          <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} divide-y ${k.rowBorder} overflow-hidden`}>
            {items.sort((a,b)=>a.date.localeCompare(b.date)).map(e => (
              <div key={e.id} className="p-4 flex items-center gap-4 group">
                <div className="w-14 text-center">
                  <div className="text-2xl font-semibold">{e.date.slice(8,10)}</div>
                  <div className={`text-[10px] uppercase ${k.muted}`}>{new Date(e.date).toLocaleDateString('en',{month:'short'})}</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${TYPE_COLOR[e.type]}`}>{e.type}</span>
                    <div className="font-medium">{e.title}</div>
                  </div>
                  {e.description && <div className={`text-sm ${k.muted}`}>{e.description}</div>}
                </div>
                <button onClick={()=>remove(e.id)} className={`opacity-0 group-hover:opacity-100 text-xs ${k.muted}`}>✕</button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
