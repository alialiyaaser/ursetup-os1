import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Send, RefreshCw } from "lucide-react";
import { osApi } from "../api";

export default function OSMail() {
  const { k, perms, user } = useOutletContext();
  const [tab, setTab] = useState("inbox");
  const [mails, setMails] = useState([]);
  const [selected, setSelected] = useState(null);
  const [compose, setCompose] = useState({ to: "", subject: "", body: "", cc: "" });
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const canAccess = ["CEO","Support Manager"].includes(user?.role) || perms.includes("support.manage") || perms.includes("support.view");

  const load = () => osApi.get("/mail/inbox").then(r => setMails(r.data)).catch(()=>{});
  useEffect(() => { if (canAccess) load(); }, [canAccess]);

  const sync = async () => {
    setSyncing(true);
    try { const { data } = await osApi.post("/mail/sync"); toast.success(`Synced · ${data.new} new`); load(); }
    catch (err) { toast.error(err.response?.data?.detail || "Sync failed"); }
    finally { setSyncing(false); }
  };

  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    try { await osApi.post("/mail/send", compose); toast.success("Sent"); setCompose({to:"",subject:"",body:"",cc:""}); setTab("inbox"); load(); }
    catch (err) { toast.error(err.response?.data?.detail || "Send failed"); }
    finally { setSending(false); }
  };

  const markRead = async (m) => { await osApi.post(`/mail/${m.id}/read`); load(); setSelected({...m, read: true}); };

  if (!canAccess) {
    return <div className="p-8 text-center">
      <p className={`text-sm ${k.muted}`}>🔒 Mail is restricted to CEO, Support Manager, and Support roles.</p>
    </div>;
  }

  const inbox = mails.filter(m => m.type !== "sent");
  const sent = mails.filter(m => m.type === "sent");
  const list = tab === "inbox" ? inbox : sent;

  return (
    <div data-testid="os-mail" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Mail</h1>
          <p className={`mt-1 text-sm ${k.muted}`}>Gmail integration · إرسال واستقبال من داخل النظام</p>
        </div>
        <div className="flex gap-2">
          <button onClick={sync} disabled={syncing} className={`border ${k.ghost} rounded-md px-3 py-1.5 text-xs inline-flex items-center gap-1.5`}>
            <RefreshCw className={`w-3.5 h-3.5 ${syncing?'animate-spin':''}`} /> Sync
          </button>
          <button onClick={()=>setTab("compose")} className={`${k.primary} rounded-md px-3 py-1.5 text-xs inline-flex items-center gap-1.5`}>
            <Send className="w-3.5 h-3.5" /> Compose
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {[["inbox", `Inbox (${inbox.length})`],["sent", `Sent (${sent.length})`],["compose", "Compose"]].map(([key,label]) => (
          <button key={key} onClick={()=>setTab(key)} className={`px-3 py-1.5 text-xs rounded-md border ${tab===key?k.primary:k.ghost}`}>{label}</button>
        ))}
      </div>

      {tab === "compose" ? (
        <form onSubmit={send} className={`border rounded-xl p-5 ${k.cardBg} ${k.cardBorder} space-y-3`}>
          <input required type="email" placeholder="To" value={compose.to} onChange={(e)=>setCompose({...compose,to:e.target.value})} className={`w-full px-3 py-2 rounded-md border text-sm ${k.input}`} />
          <input placeholder="CC (comma-separated)" value={compose.cc} onChange={(e)=>setCompose({...compose,cc:e.target.value})} className={`w-full px-3 py-2 rounded-md border text-sm ${k.input}`} />
          <input required placeholder="Subject" value={compose.subject} onChange={(e)=>setCompose({...compose,subject:e.target.value})} className={`w-full px-3 py-2 rounded-md border text-sm ${k.input}`} />
          <textarea required rows={8} placeholder="Message..." value={compose.body} onChange={(e)=>setCompose({...compose,body:e.target.value})} className={`w-full px-3 py-2 rounded-md border text-sm ${k.input}`} />
          <button type="submit" disabled={sending} className={`${k.primary} rounded-md px-6 py-2 text-sm inline-flex items-center gap-2`}><Send className="w-4 h-4" /> {sending?"Sending...":"Send"}</button>
        </form>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} divide-y ${k.rowBorder} max-h-[70vh] overflow-y-auto`}>
            {list.length === 0 ? <p className={`p-12 text-center text-sm ${k.muted}`}>No emails · press Sync</p> :
              list.map(m => (
                <button key={m.id} onClick={()=>{ setSelected(m); if (!m.read) markRead(m); }}
                  className={`w-full text-start p-3 ${k.hover} ${selected?.id===m.id?k.accentSoft:''} ${!m.read?'font-semibold':''}`}>
                  <div className="flex items-center justify-between mb-0.5 gap-2">
                    <span className="text-sm truncate">{tab==='inbox'?m.from:m.to}</span>
                    {!m.read && tab==='inbox' && <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />}
                  </div>
                  <div className={`text-xs truncate ${k.muted}`}>{m.subject}</div>
                </button>
              ))}
          </div>
          {selected ? (
            <div className={`border rounded-xl p-5 ${k.cardBg} ${k.cardBorder} max-h-[70vh] overflow-y-auto`}>
              <h3 className="text-lg font-semibold mb-2">{selected.subject}</h3>
              <div className={`text-xs mb-4 ${k.muted}`}>
                <div>From: {selected.from || user.email}</div>
                <div>To: {selected.to}</div>
                {selected.date && <div>Date: {selected.date}</div>}
              </div>
              <div className="text-sm whitespace-pre-wrap">{selected.body}</div>
            </div>
          ) : <div className={`border rounded-xl p-12 text-center text-sm ${k.cardBg} ${k.cardBorder} ${k.muted}`}>Select an email</div>}
        </div>
      )}
    </div>
  );
}
