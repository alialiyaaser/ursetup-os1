import React, { useEffect, useState, useCallback, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Upload, Trash2, FolderKanban, Image as ImgIcon, Film, FileText, Download, Play } from "lucide-react";
import { osApi } from "../api";

const CATEGORIES = ["logos","videos","images","documents","brand_assets"];

export default function OSFiles() {
  const { k, perms, user } = useOutletContext();
  const [files, setFiles] = useState([]);
  const [cat, setCat] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);
  const canManage = perms.includes("files.manage") || perms.includes("employees.manage");

  const load = useCallback(() => osApi.get("/files").then(r => setFiles(r.data)).catch(()=>{}), []);
  useEffect(() => { load(); }, [load]);

  const upload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 50 * 1024 * 1024) { toast.error("Max 50MB"); if(fileRef.current) fileRef.current.value=""; return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      let inferred = "documents";
      if (f.type.startsWith("image/")) inferred = "images";
      else if (f.type.startsWith("video/")) inferred = "videos";
      fd.append("category", cat === "all" ? inferred : cat);
      await osApi.post("/files/upload", fd, { headers: { "Content-Type":"multipart/form-data" } });
      toast.success(`Uploaded: ${f.name}`); load();
    } catch (err) { toast.error(err.response?.data?.detail || "Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this file?")) return;
    try { await osApi.delete(`/files/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Delete failed"); }
  };

  const shown = cat === "all" ? files : files.filter(f => f.category === cat);
  const isImg = (ct) => ct?.startsWith("image/");
  const isVid = (ct) => ct?.startsWith("video/");
  const iconFor = (f) => isImg(f.content_type) ? ImgIcon : isVid(f.content_type) ? Film : FileText;

  return (
    <div data-testid="os-files" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Files</h1>
          <p className={`mt-1 text-sm ${k.muted}`}>مكتبة الشعارات، الصور، الفيديوهات، والمستندات — مربوطة بحسابك.</p>
        </div>
        <label className="cursor-pointer">
          <span data-testid="upload-btn" className={`${k.primary} rounded-md px-4 py-2 text-sm inline-flex items-center gap-2 ${uploading?"opacity-50":""}`}>
            <Upload className="w-4 h-4" /> {uploading?"Uploading...":"Upload file"}
          </span>
          <input ref={fileRef} type="file" className="hidden" onChange={upload} data-testid="file-input" disabled={uploading} accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip" />
        </label>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", ...CATEGORIES].map(c => (
          <button key={c} onClick={()=>setCat(c)} data-testid={`cat-${c}`}
            className={`text-xs px-3 py-1 rounded-md border ${cat===c?k.primary:k.ghost}`}>{c.replace(/_/g,' ')}</button>
        ))}
      </div>

      {shown.length === 0 ? (
        <label className={`block cursor-pointer border-2 border-dashed rounded-xl p-12 text-center ${k.cardBg} ${k.cardBorder}`}>
          <FolderKanban className={`w-8 h-8 mx-auto mb-3 ${k.muted}`} />
          <p className="text-sm font-medium">Drop or click to upload your first file</p>
          <p className={`text-xs ${k.muted}`}>Images, videos, PDFs — max 50MB</p>
          <input type="file" className="hidden" onChange={upload} disabled={uploading} />
        </label>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {shown.map(f => {
            const Icon = iconFor(f);
            const url = `${process.env.REACT_APP_BACKEND_URL}${f.url}`;
            const owned = f.uploader_id === user?.id;
            return (
              <div key={f.id} className={`border rounded-lg overflow-hidden ${k.cardBg} ${k.cardBorder} group`} data-testid={`file-${f.id}`}>
                <button type="button" onClick={()=>setPreview({ ...f, url })} className={`aspect-video w-full ${k.accentSoft} flex items-center justify-center overflow-hidden`}>
                  {isImg(f.content_type) ? <img src={url} alt="" className="w-full h-full object-cover" />
                    : isVid(f.content_type) ? <div className="relative w-full h-full"><video src={url} className="w-full h-full object-cover" /><div className="absolute inset-0 flex items-center justify-center bg-black/30"><Play className="w-8 h-8 text-white" /></div></div>
                    : <Icon className={`w-8 h-8 ${k.muted}`} />}
                </button>
                <div className="p-2.5">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{f.filename}</div>
                      <div className={`text-xs ${k.muted}`}>{(f.size/1024).toFixed(1)} KB · {f.uploader_name}</div>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100">
                      <a href={url} download={f.filename} className={k.muted} title="Download"><Download className="w-3.5 h-3.5" /></a>
                      {(canManage || owned) && <button onClick={()=>remove(f.id)} className={k.muted} title="Delete" data-testid={`delete-${f.id}`}><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={()=>setPreview(null)}>
          <div className="max-w-4xl max-h-full" onClick={(e)=>e.stopPropagation()}>
            {isImg(preview.content_type) ? <img src={preview.url} alt="" className="max-h-[85vh] rounded-lg" />
              : isVid(preview.content_type) ? <video src={preview.url} controls autoPlay className="max-h-[85vh] rounded-lg bg-black" />
              : <div className={`p-8 rounded-lg ${k.cardBg}`}><FileText className={`w-12 h-12 mb-3 ${k.muted}`} /><a href={preview.url} download={preview.filename} className="underline">Download {preview.filename}</a></div>}
            <div className="mt-3 text-center text-xs text-white/60">Uploaded by {preview.uploader_name}</div>
          </div>
        </div>
      )}
    </div>
  );
}
