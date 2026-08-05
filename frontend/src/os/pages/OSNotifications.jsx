import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Bell } from "lucide-react";
import { osApi } from "../api";

export default function OSNotifications() {
  const { k } = useOutletContext();
  const [notifs, setNotifs] = useState([]);
  const load = () => osApi.get("/notifications").then(r => setNotifs(r.data)).catch(()=>{});
  useEffect(() => { load(); const iv = setInterval(load, 15000); return ()=>clearInterval(iv); }, []);
  const markAll = async () => { await osApi.post("/notifications/read_all"); load(); };
  const markOne = async (id) => { await osApi.post(`/notifications/${id}/read`); load(); };

  return (
    <div data-testid="os-notifications" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Notifications</h1>
          <p className={`mt-1 text-sm ${k.muted}`}>جميع تنبيهات النظام.</p>
        </div>
        <button onClick={markAll} data-testid="mark-all-btn" className={`border ${k.ghost} rounded-md px-3 py-1.5 text-xs`}>Mark all read</button>
      </div>
      <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} divide-y ${k.rowBorder} overflow-hidden`}>
        {notifs.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className={`w-8 h-8 mx-auto mb-3 ${k.muted}`} />
            <p className="font-semibold">All caught up</p>
            <p className={`text-sm ${k.muted}`}>No notifications right now.</p>
          </div>
        ) : notifs.map(n => (
          <button key={n.id} onClick={()=>markOne(n.id)} data-testid={`notif-${n.id}`} className={`w-full text-start p-4 ${k.hover} ${!n.read?k.accentSoft:''}`}>
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.read?'bg-blue-400':'bg-transparent'}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{n.title}</div>
                <div className={`text-sm ${k.muted}`}>{n.body}</div>
                <div className={`text-xs mt-1 font-mono ${k.muted}`}>{new Date(n.created_at).toLocaleString()}</div>
              </div>
              <span className={`text-[10px] uppercase tracking-wide ${k.muted}`}>{n.type.replace(/_/g,' ')}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
