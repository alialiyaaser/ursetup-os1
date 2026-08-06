import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Zap, Check, Briefcase, Sparkles, ArrowRight } from "lucide-react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function JoinUs() {
  const [positions, setPositions] = useState([]);
  const [form, setForm] = useState({ name:"", age:"", city:"", email:"", phone:"", position:"", experiences:"", years:"", portfolio:"", socials:"", message:"" });
  const [cv, setCv] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    axios.get(`${API}/api/positions`).then(r => setPositions(r.data || [])).catch(() => setPositions([]));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (cv) fd.append("cv", cv);
      await axios.post(`${API}/api/applications`, fd);
      setDone(true);
      toast.success("Application submitted!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Submission failed");
    } finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6"><Check className="w-8 h-8" /></div>
          <h2 className="text-3xl font-semibold mb-3 tracking-tight">تم استلام طلبك</h2>
          <p className="text-white/60 mb-6">شكرًا لتقديمك. فريق الموارد البشرية سيراجع طلبك ويرد عليك قريبًا.</p>
          <button onClick={() => { setDone(false); setForm({ name:"",age:"",city:"",email:"",phone:"",position:"",experiences:"",years:"",portfolio:"",socials:"",message:"" }); setCv(null); }}
            className="border border-white/20 hover:bg-white/5 rounded-md px-4 py-2 text-sm">Submit another</button>
        </div>
      </div>
    );
  }

  const noPositions = positions.length === 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white" dir="ltr">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0A0A0A]/85 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center"><Zap className="w-4 h-4 text-black" strokeWidth={2.5} /></div>
            <span className="font-semibold">UR SETUP · Careers</span>
          </Link>
          <Link to="/os/login" className="text-xs uppercase tracking-widest text-white/60 hover:text-white" data-testid="team-login-link">Team login →</Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-24 lg:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1 text-xs mb-6">
            <Sparkles className="w-3.5 h-3.5" /> {noPositions ? "Applications open" : `${positions.length} open position${positions.length>1?"s":""}`}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight max-w-3xl leading-[1.05]">
            ابنِ مسيرتك <span className="text-white/60">معنا</span>.<br />Build your career with us.
          </h1>
          <p className="mt-6 text-lg text-white/60 max-w-2xl">انضم إلى فريق UR SETUP حيث نبني منتجات استثنائية بحرفية سعودية.</p>
          <a href="#apply" className="mt-8 inline-flex items-center gap-2 text-sm font-medium hover:underline">Apply now <ArrowRight className="w-4 h-4" /></a>
        </div>
      </section>

      {positions.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16 border-b border-white/[0.06]">
          <h2 className="text-2xl font-semibold mb-6">Open positions</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {positions.map(p => (
              <button key={p.id} onClick={()=>{ setForm(f=>({...f, position: p.title})); document.getElementById("apply")?.scrollIntoView({behavior:"smooth"}); }}
                className="text-start border border-white/[0.08] hover:border-white/30 rounded-xl p-4 bg-[#141416] transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-semibold">{p.title}</div>
                  <span className="text-[10px] uppercase tracking-widest text-emerald-400">Open</span>
                </div>
                {p.department && <div className="text-xs text-white/40 mb-2">{p.department}</div>}
                {p.description && <div className="text-sm text-white/60 line-clamp-2">{p.description}</div>}
              </button>
            ))}
          </div>
        </section>
      )}

      <section id="apply" className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center"><Briefcase className="w-5 h-5" /></div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Application form</h2>
            <p className="text-sm text-white/60">{noPositions ? "لا توجد وظائف مفتوحة حالياً — يمكنك التسجيل في قاعدة المتقدمين." : "استكمل البيانات — كل الحقول مطلوبة."}</p>
          </div>
        </div>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4 border border-white/[0.08] bg-[#141416] p-6 rounded-xl" data-testid="application-form">
          {[["name","الاسم الكامل","text"],["age","العمر","number"],["city","المدينة","text"],["email","البريد الإلكتروني","email"],["phone","رقم الجوال","tel"],["years","سنوات الخبرة","number"]].map(([k,label,type]) => (
            <div key={k}>
              <label className="text-[10px] font-mono tracking-[0.15em] uppercase mb-1.5 block text-white/60">{label}*</label>
              <input required type={type} value={form[k]} onChange={upd(k)} data-testid={`app-${k}`}
                className="w-full bg-[#0A0A0A] border border-white/[0.1] focus:border-white/40 rounded-md px-3 py-2.5 text-sm" />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="text-[10px] font-mono tracking-[0.15em] uppercase mb-1.5 block text-white/60">الوظيفة المطلوبة*</label>
            <select required value={form.position} onChange={upd("position")} data-testid="app-position"
              className="w-full bg-[#0A0A0A] border border-white/[0.1] focus:border-white/40 rounded-md px-3 py-2.5 text-sm">
              <option value="">Select</option>
              {positions.map(p => <option key={p.id} value={p.title}>{p.title}{p.department?` — ${p.department}`:""}</option>)}
              {noPositions && <option value="General">General / Talent pool</option>}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-mono tracking-[0.15em] uppercase mb-1.5 block text-white/60">الخبرات</label>
            <textarea required rows={3} value={form.experiences} onChange={upd("experiences")} data-testid="app-experiences"
              className="w-full bg-[#0A0A0A] border border-white/[0.1] focus:border-white/40 rounded-md px-3 py-2.5 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-mono tracking-[0.15em] uppercase mb-1.5 block text-white/60">معرض الأعمال (رابط)</label>
            <input type="url" value={form.portfolio} onChange={upd("portfolio")} data-testid="app-portfolio"
              className="w-full bg-[#0A0A0A] border border-white/[0.1] focus:border-white/40 rounded-md px-3 py-2.5 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-mono tracking-[0.15em] uppercase mb-1.5 block text-white/60">حسابات التواصل</label>
            <input value={form.socials} onChange={upd("socials")} placeholder="Instagram, X, LinkedIn..." data-testid="app-socials"
              className="w-full bg-[#0A0A0A] border border-white/[0.1] focus:border-white/40 rounded-md px-3 py-2.5 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-mono tracking-[0.15em] uppercase mb-1.5 block text-white/60">رسالة تعريفية</label>
            <textarea rows={4} value={form.message} onChange={upd("message")} data-testid="app-message"
              className="w-full bg-[#0A0A0A] border border-white/[0.1] focus:border-white/40 rounded-md px-3 py-2.5 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-mono tracking-[0.15em] uppercase mb-1.5 block text-white/60">السيرة الذاتية (PDF)</label>
            <input type="file" accept="application/pdf" onChange={(e)=>setCv(e.target.files?.[0] || null)} data-testid="app-cv"
              className="w-full bg-[#0A0A0A] border border-white/[0.1] rounded-md px-3 py-2.5 text-sm" />
            <p className="text-xs text-white/40 mt-1">Max 10MB. PDF only.</p>
          </div>
          <div className="sm:col-span-2 pt-2">
            <button type="submit" disabled={submitting} data-testid="app-submit"
              className="bg-white text-black hover:bg-white/90 rounded-md py-2.5 px-6 text-sm font-medium w-full sm:w-auto disabled:opacity-50">
              {submitting ? "Submitting..." : "Submit application"}
            </button>
          </div>
        </form>
      </section>

      <footer className="border-t border-white/[0.06] py-8 text-center text-xs text-white/40">© {new Date().getFullYear()} UR SETUP. All rights reserved.</footer>
    </div>
  );
}
