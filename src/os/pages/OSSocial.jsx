import React, { useEffect, useState, useCallback, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Sparkles, Trash2, Image as ImgIcon, Film, X, Info } from "lucide-react";
import { osApi } from "../api";
import { PLATFORM_LIMITS, validateForPlatform } from "../socialLimits";

const PLATFORMS = ["tiktok","instagram","snapchat","x"];
const PLATFORM_COLOR = {
  tiktok: "border-white/30 text-white",
  instagram: "border-pink-400/40 text-pink-400",
  snapchat: "border-yellow-400/40 text-yellow-400",
  x: "border-slate-400/40 text-slate-400",
};

export default function OSSocial() {
  const { t, k, perms } = useOutletContext();
  const [posts, setPosts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ platform: "instagram", content: "", scheduled_at: "", assigned_to: "", status: "draft", media_url: "" });
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const fileRef = useRef(null);
  const canAI = perms.includes("ai.use");
  const canManage = perms.includes("social.manage");

  const load = useCallback(async () => {
    try {
      const [p, emp] = await Promise.all([osApi.get("/social/posts"), osApi.get("/employees/lookup")]);
      setPosts(p.data); setEmployees(emp.data);
    } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  const uploadMedia = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    // Platform-specific validation
    const check = await validateForPlatform(f, form.platform);
    if (!check.ok) {
      toast.error(check.error, { description: check.hint });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      fd.append("category", f.type.startsWith("video/") ? "videos" : "images");
      const { data } = await osApi.post("/files/upload", fd, { headers: { "Content-Type":"multipart/form-data" } });
      setForm(f0 => ({ ...f0, media_url: data.url }));
      toast.success(`تم الرفع لـ ${PLATFORM_LIMITS[form.platform]?.label || form.platform}`);
    } catch (err) { toast.error(err.response?.data?.detail || "Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const clearMedia = () => setForm(f0 => ({ ...f0, media_url: "" }));

  const create = async (e) => {
    e.preventDefault();
    try {
      await osApi.post("/social/posts", form);
      toast.success(t.common.created);
      setShowForm(false);
      setForm({ platform: "instagram", content: "", scheduled_at: "", assigned_to: "", status: "draft", media_url: "" });
      load();
    } catch { toast.error(t.common.failed); }
  };

  const remove = async (id) => { await osApi.delete(`/social/posts/${id}`); load(); };

  const generateAI = async () => {
    setAiLoading(true);
    try {
      const { data } = await osApi.post("/ai/generate", { prompt: aiPrompt, context: "Write a social media caption. Include emojis and hashtags. Bilingual Arabic + English if appropriate." });
      setAiText(data.text);
    } catch { toast.error("AI failed"); }
    finally { setAiLoading(false); }
  };

  const shown = filter === "all" ? posts : posts.filter(p => p.platform === filter);
  const mediaUrl = (u) => u ? `${process.env.REACT_APP_BACKEND_URL}${u}` : "";
  const isVideo = (u) => u && /\.(mp4|mov|webm|avi|mkv)$/i.test(u);
  const isImage = (u) => u && /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(u);

  return (
    <div data-testid="os-social" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Social Media</h1>
          <p className={`mt-1 text-sm ${k.muted}`}>جدولة المحتوى مع رفع صور وفيديوهات + AI captions.</p>
        </div>
        {canManage && (
          <button onClick={()=>setShowForm(!showForm)} data-testid="new-post-btn"
            className={`${k.primary} rounded-md px-4 py-2 text-sm inline-flex items-center gap-2`}>
            <Plus className="w-4 h-4" /> New post
          </button>
        )}
      </div>

      {canAI && (
        <div className={`border rounded-xl p-4 ${k.cardBg} ${k.cardBorder}`}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4" />
            <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>AI Caption (Gemini 3.1 Pro)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input value={aiPrompt} onChange={(e)=>setAiPrompt(e.target.value)} placeholder="Describe the post..." data-testid="ai-prompt"
              className={`flex-1 min-w-[200px] px-3 py-2 rounded-md border text-sm ${k.input}`} />
            <button onClick={generateAI} disabled={aiLoading || !aiPrompt} data-testid="ai-generate"
              className={`${k.primary} rounded-md px-3 py-1.5 text-xs disabled:opacity-50`}>
              {aiLoading ? "Generating..." : "Generate"}
            </button>
          </div>
          {aiText && (
            <div className={`mt-3 p-3 rounded-md border ${k.cardBorder} text-sm whitespace-pre-wrap`}>{aiText}
              <button className={`ms-2 text-xs ${k.muted} hover:${k.shellText} underline`}
                onClick={()=>{ setForm({...form, content: aiText}); setShowForm(true); }}>Use →</button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={create} className={`border rounded-xl p-5 ${k.cardBg} ${k.cardBorder} grid md:grid-cols-2 gap-3`}>
          <select value={form.platform} onChange={(e)=>setForm({...form,platform:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} data-testid="post-platform">
            {PLATFORMS.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <select value={form.status} onChange={(e)=>setForm({...form,status:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`}>
            {["draft","scheduled","published"].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <textarea required rows={5} placeholder="Content..." value={form.content} onChange={(e)=>setForm({...form,content:e.target.value})} data-testid="post-content"
            className={`px-3 py-2 rounded-md border text-sm ${k.input} md:col-span-2`} />

          {/* Media upload */}
          <div className="md:col-span-2">
            <label className={`text-[10px] font-mono tracking-[0.24em] uppercase mb-2 flex items-center gap-2 ${k.muted}`}>
              Media (image / video)
              {PLATFORM_LIMITS[form.platform] && (
                <span className="flex items-center gap-1 normal-case tracking-normal text-[11px]">
                  <Info className="w-3 h-3" /> {PLATFORM_LIMITS[form.platform].notes}
                </span>
              )}
            </label>
            {form.media_url ? (
              <div className={`relative border rounded-lg overflow-hidden ${k.cardBorder}`}>
                {isVideo(form.media_url) ? (
                  <video src={mediaUrl(form.media_url)} controls className="w-full max-h-64 bg-black" />
                ) : isImage(form.media_url) ? (
                  <img src={mediaUrl(form.media_url)} alt="" className="w-full max-h-64 object-cover" />
                ) : (
                  <div className={`p-6 text-sm ${k.muted}`}>Attached: {form.media_url}</div>
                )}
                <button type="button" onClick={clearMedia} className="absolute top-2 end-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black" data-testid="clear-media-btn">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer ${k.cardBorder} ${k.hover}`}>
                <div className="flex items-center gap-2 mb-2">
                  <ImgIcon className={`w-5 h-5 ${k.muted}`} />
                  <Film className={`w-5 h-5 ${k.muted}`} />
                </div>
                <span className="text-sm font-medium">{uploading ? "Uploading..." : `Upload for ${PLATFORM_LIMITS[form.platform]?.label || form.platform}`}</span>
                {PLATFORM_LIMITS[form.platform] && (
                  <span className={`text-xs mt-1 text-center ${k.muted}`}>
                    Image ≤ {PLATFORM_LIMITS[form.platform].image.maxMB}MB · Video ≤ {PLATFORM_LIMITS[form.platform].video.maxMB}MB, ≤ {PLATFORM_LIMITS[form.platform].video.maxSeconds}s
                  </span>
                )}
                <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={uploadMedia} disabled={uploading} data-testid="post-media-input" />
              </label>
            )}
          </div>

          <input type="datetime-local" value={form.scheduled_at} onChange={(e)=>setForm({...form,scheduled_at:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} data-testid="post-schedule" />
          <select value={form.assigned_to} onChange={(e)=>setForm({...form,assigned_to:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`}>
            <option value="">Unassigned</option>{employees.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button type="submit" data-testid="post-submit" className={`${k.primary} rounded-md py-2 text-sm md:col-span-2`}>Save</button>
        </form>
      )}

      <div className="flex gap-2 flex-wrap">
        {["all", ...PLATFORMS].map(p => (
          <button key={p} onClick={()=>setFilter(p)} className={`px-3 py-1 text-xs rounded-md border ${filter===p?k.primary:k.ghost}`}>{p}</button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shown.length === 0 ? <div className={`col-span-full border rounded-xl p-12 text-center text-sm ${k.cardBg} ${k.cardBorder} ${k.muted}`}>No posts</div> :
          shown.map(p => {
            const a = employees.find(u=>u.id===p.assigned_to);
            return (
              <div key={p.id} className={`border rounded-xl overflow-hidden ${k.cardBg} ${k.cardBorder}`} data-testid={`post-${p.id}`}>
                {p.media_url && (
                  <div className={`aspect-video overflow-hidden ${k.accentSoft}`}>
                    {isVideo(p.media_url) ? (
                      <video src={mediaUrl(p.media_url)} controls className="w-full h-full object-cover bg-black" />
                    ) : (
                      <img src={mediaUrl(p.media_url)} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${PLATFORM_COLOR[p.platform]}`}>{p.platform}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${k.muted}`}>{p.status}</span>
                      {canManage && <button onClick={()=>remove(p.id)} className={k.muted}><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </div>
                  <div className="text-sm whitespace-pre-wrap line-clamp-5">{p.content}</div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    {p.scheduled_at && <span className={`font-mono ${k.muted}`}>{new Date(p.scheduled_at).toLocaleString()}</span>}
                    {a && <span className={k.muted}>{a.name}</span>}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
