import React, { useEffect, useState, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { Send, Plus, Hash, Paperclip, Zap, Check, CheckCheck, Trash2, Play, X } from "lucide-react";
import { osApi } from "../api";
import { toast } from "sonner";

const isImageUrl = (u) => u && /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(u);
const isVideoUrl = (u) => u && /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(u);
const isAudioUrl = (u) => u && /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(u);
const mediaFull = (u) => `${process.env.REACT_APP_BACKEND_URL}${u}`;

export default function OSTeamChat() {
  const { user, t, k } = useOutletContext();
  const [channels, setChannels] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [employees, setEmployees] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [newCh, setNewCh] = useState({ name: "", members: [] });
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [typingUsers, setTypingUsers] = useState({}); // { user_id: user_name }
  const [lightbox, setLightbox] = useState(null);
  const scrollRef = useRef(null);
  const wsRef = useRef(null);
  const typingSentRef = useRef(false);
  const typingTimerRef = useRef(null);
  const typingClearRef = useRef({}); // { user_id: timeoutHandle }

  const loadCh = useCallback(async () => {
    try { const r = await osApi.get("/channels"); setChannels(r.data); if (!active && r.data[0]) setActive(r.data[0]); } catch {}
  }, [active]);
  const loadEmp = async () => { try { const r = await osApi.get("/employees/lookup"); setEmployees(r.data); } catch {} };
  const loadMsg = async (id) => {
    try {
      const r = await osApi.get(`/channels/${id}/messages`);
      setMessages(r.data);
      // Mark all others' messages as read
      const toMark = r.data.filter(m => m.user_id !== user.id && !(m.read_by || []).some(rb => rb.user_id === user.id)).map(m => m.id);
      if (toMark.length) osApi.post("/messages/mark_read", { message_ids: toMark }).catch(()=>{});
    } catch {}
  };

  useEffect(() => { loadCh(); loadEmp(); }, [loadCh]);

  // WebSocket: real-time messages + typing + read receipts
  useEffect(() => {
    if (!active) return;
    loadMsg(active.id);
    setTypingUsers({});
    const token = localStorage.getItem("ur_admin_token");
    if (!token) return;
    const wsUrl = process.env.REACT_APP_BACKEND_URL.replace(/^http/, "ws") + `/api/os/ws/chat/${active.id}?token=${token}`;
    let ws; let stopped = false; let retries = 0;
    const connect = () => {
      if (stopped) return;
      setWsStatus("connecting");
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => { setWsStatus("live"); retries = 0; };
      ws.onmessage = (ev) => {
        try {
          const evt = JSON.parse(ev.data);
          if (evt.type === "msg") {
            setMessages(prev => prev.some(m => m.id === evt.id) ? prev : [...prev, evt]);
            // Auto-mark others' messages as read
            if (evt.user_id !== user.id) {
              osApi.post("/messages/mark_read", { message_ids: [evt.id] }).catch(()=>{});
            }
          } else if (evt.type === "typing") {
            if (evt.user_id === user.id) return;
            setTypingUsers(prev => {
              const next = { ...prev };
              if (evt.is_typing) next[evt.user_id] = evt.user_name;
              else delete next[evt.user_id];
              return next;
            });
            // Auto-clear typing after 4s if we don't get another typing:false
            if (evt.is_typing) {
              clearTimeout(typingClearRef.current[evt.user_id]);
              typingClearRef.current[evt.user_id] = setTimeout(() => {
                setTypingUsers(prev => { const n = {...prev}; delete n[evt.user_id]; return n; });
              }, 4000);
            }
          } else if (evt.type === "read") {
            setMessages(prev => prev.map(m => {
              if (m.id !== evt.message_id) return m;
              const already = (m.read_by || []).some(r => r.user_id === evt.reader.user_id);
              return already ? m : { ...m, read_by: [...(m.read_by || []), evt.reader] };
            }));
          } else if (evt.type === "delete") {
            setMessages(prev => prev.map(m => m.id === evt.message_id
              ? { ...m, deleted: true, text: "", file_url: null, deleted_by_name: evt.deleted_by_name }
              : m
            ));
          }
        } catch {}
      };
      ws.onclose = () => {
        setWsStatus("disconnected");
        if (!stopped) { retries++; setTimeout(connect, Math.min(5000, 500 * 2**retries)); }
      };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => { stopped = true; try { ws?.close(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [messages, typingUsers]);

  // Send typing events on input
  const handleTextChange = (v) => {
    setText(v);
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (v.length > 0 && !typingSentRef.current) {
      typingSentRef.current = true;
      try { ws.send(JSON.stringify({ type: "typing", is_typing: true })); } catch {}
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (typingSentRef.current) {
        typingSentRef.current = false;
        try { ws.send(JSON.stringify({ type: "typing", is_typing: false })); } catch {}
      }
    }, 2500);
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    const ws = wsRef.current;
    // Stop typing indicator on send
    if (ws && ws.readyState === WebSocket.OPEN && typingSentRef.current) {
      try { ws.send(JSON.stringify({ type: "typing", is_typing: false })); } catch {}
      typingSentRef.current = false;
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "msg", text }));
      setText("");
    } else {
      try { await osApi.post("/messages", { channel_id: active.id, text }); setText(""); loadMsg(active.id); }
      catch { toast.error("Send failed"); }
    }
  };

  const createChannel = async (e) => {
    e.preventDefault();
    try { await osApi.post("/channels", { name: newCh.name, type: newCh.members.length?"group":"public", members: newCh.members });
      toast.success("Created"); setShowNew(false); setNewCh({ name:"", members:[] }); loadCh();
    } catch { toast.error("Failed"); }
  };

  const uploadFile = async (e) => {
    const f = e.target.files?.[0]; if (!f || !active) return;
    const fd = new FormData(); fd.append("file", f); fd.append("category", "chat");
    const { data } = await osApi.post("/files/upload", fd, { headers: { "Content-Type":"multipart/form-data" } });
    const ws = wsRef.current;
    const payload = { type: "msg", text: `📎 ${f.name}`, file_url: data.url };
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
    else { await osApi.post("/messages", { channel_id: active.id, ...payload }); loadMsg(active.id); }
    e.target.value = "";
  };

  const deleteMessage = async (mid) => {
    if (!window.confirm("حذف الرسالة؟")) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "delete", message_id: mid }));
    } else {
      try { await osApi.delete(`/messages/${mid}`); loadMsg(active.id); }
      catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    }
  };

  const typingNames = Object.values(typingUsers);

  return (
    <div className={`border rounded-xl overflow-hidden ${k.cardBg} ${k.cardBorder}`} style={{ height: "calc(100vh - 12rem)" }} data-testid="os-chat">
      <div className="grid grid-cols-[240px_1fr] h-full">
        <div className={`border-e ${k.cardBorder} flex flex-col`}>
          <div className={`p-3 border-b ${k.cardBorder} flex items-center justify-between`}>
            <span className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>Channels</span>
            <button onClick={()=>setShowNew(!showNew)} className={k.muted} data-testid="new-channel-btn"><Plus className="w-4 h-4" /></button>
          </div>
          {showNew && <form onSubmit={createChannel} className={`p-3 border-b ${k.cardBorder} space-y-2`}>
            <input required placeholder="Name" value={newCh.name} onChange={(e)=>setNewCh({...newCh,name:e.target.value})} className={`w-full px-2 py-1.5 rounded-md border text-xs ${k.input}`} />
            <div className="max-h-24 overflow-y-auto space-y-1">
              {employees.filter(e=>e.id!==user.id).map(u => (
                <label key={u.id} className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={newCh.members.includes(u.id)}
                    onChange={()=>setNewCh({...newCh, members: newCh.members.includes(u.id) ? newCh.members.filter(x=>x!==u.id) : [...newCh.members, u.id]})} />
                  {u.name}
                </label>
              ))}
            </div>
            <button type="submit" className={`${k.primary} rounded-md w-full py-1.5 text-xs`}>Create</button>
          </form>}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {channels.map(c => (
              <button key={c.id} onClick={()=>setActive(c)} data-testid={`channel-${c.name}`}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-start ${active?.id===c.id ? `${k.accentSoft}` : `${k.muted} ${k.hover}`}`}>
                <Hash className="w-3.5 h-3.5" /> {c.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col min-h-0">
          {active ? (
            <>
              <div className={`h-12 flex items-center px-4 border-b ${k.cardBorder} justify-between`}>
                <div className="flex items-center">
                  <Hash className={`w-4 h-4 me-2 ${k.muted}`} /><span className="font-semibold">{active.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest" data-testid="ws-status">
                  <span className={`w-1.5 h-1.5 rounded-full ${wsStatus==='live'?'bg-emerald-500':'bg-yellow-500'}`} />
                  <span className={k.muted}>{wsStatus === 'live' ? 'LIVE' : wsStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE'}</span>
                  {wsStatus === 'live' && <Zap className="w-3 h-3 text-emerald-500" />}
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && <p className={`text-sm text-center pt-10 ${k.muted}`}>No messages yet.</p>}
                {messages.map(m => {
                  const own = m.user_id === user.id;
                  const readBy = (m.read_by || []).filter(r => r.user_id !== user.id);
                  return (
                    <div key={m.id} className="flex items-start gap-3" data-testid={`msg-${m.id}`}>
                      <div className={`w-8 h-8 rounded-full ${k.logoBg} flex items-center justify-center text-xs font-semibold uppercase shrink-0`}>{m.user_name?.[0]}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-sm">{m.user_name}</span>
                          <span className={`text-[10px] font-mono ${k.muted}`}>{new Date(m.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-sm">{m.text}</div>
                        {m.file_url && <a href={`${process.env.REACT_APP_BACKEND_URL}${m.file_url}`} target="_blank" rel="noreferrer" className="text-xs underline">Open attachment</a>}
                        {own && (
                          <div className={`mt-1 flex items-center gap-1 text-[10px] ${k.muted}`} data-testid={`read-status-${m.id}`}>
                            {readBy.length > 0 ? (
                              <>
                                <CheckCheck className="w-3 h-3 text-blue-400" />
                                <span title={readBy.map(r=>r.user_name).join(", ")}>
                                  {readBy.length === 1 ? `شاهد ${readBy[0].user_name}` : `شاهد ${readBy.length} أشخاص`}
                                </span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3" />
                                <span>تم الإرسال</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {typingNames.length > 0 && (
                  <div className="flex items-center gap-3 pt-1" data-testid="typing-indicator">
                    <div className="w-8 h-8" />
                    <div className={`text-xs italic ${k.muted} flex items-center gap-2`}>
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      {typingNames.length === 1 ? `${typingNames[0]} يكتب الآن...` :
                       typingNames.length === 2 ? `${typingNames[0]} و ${typingNames[1]} يكتبان...` :
                       `${typingNames.length} أشخاص يكتبون...`}
                    </div>
                  </div>
                )}
              </div>
              <form onSubmit={send} className={`p-3 border-t ${k.cardBorder} flex items-center gap-2`}>
                <label className={`cursor-pointer ${k.muted}`}>
                  <Paperclip className="w-4 h-4" />
                  <input type="file" className="hidden" onChange={uploadFile} data-testid="chat-file-input" />
                </label>
                <input value={text} onChange={(e)=>handleTextChange(e.target.value)} placeholder={`Message #${active.name}`} data-testid="chat-input"
                  className={`flex-1 px-3 py-2 rounded-md border text-sm ${k.input}`} />
                <button type="submit" data-testid="chat-send" className={`${k.primary} rounded-md p-2`}><Send className="w-4 h-4" /></button>
              </form>
            </>
          ) : <div className={`flex-1 flex items-center justify-center text-sm ${k.muted}`}>Select a channel</div>}
        </div>
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6" onClick={()=>setLightbox(null)} data-testid="chat-lightbox">
          <button onClick={()=>setLightbox(null)} className="absolute top-4 end-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"><X className="w-5 h-5" /></button>
          <img src={lightbox.url} alt="" className="max-h-[90vh] max-w-full rounded-lg" onClick={(e)=>e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
