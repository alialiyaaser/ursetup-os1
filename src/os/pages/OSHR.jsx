import React, { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp, TrendingDown, ArrowUp, AlertTriangle } from "lucide-react";
import { osApi } from "../api";

const TABS = [
  { key: "attendance", label: "الحضور والانصراف", en: "Attendance" },
  { key: "leaves", label: "الإجازات", en: "Leaves" },
  { key: "payroll", label: "الرواتب", en: "Payroll" },
  { key: "bonuses", label: "المكافآت", en: "Bonuses" },
  { key: "deductions", label: "الخصومات", en: "Deductions" },
  { key: "evaluations", label: "التقييم", en: "Evaluations" },
  { key: "promotions", label: "الترقيات", en: "Promotions" },
  { key: "penalties", label: "العقوبات", en: "Penalties" },
  { key: "positions", label: "الوظائف المفتوحة", en: "Open positions" },
  { key: "roles", label: "الرتب والصلاحيات", en: "Roles & permissions" },
];

const ROLES = ["CEO","COO","HR Manager","Marketing Manager","Marketing","Operations Manager","Operations","Support Manager","Support","Finance Manager","Finance","Designer","Video Editor","Content Creator","Social Media Manager","Warehouse Manager","Employee","Intern"];

export default function OSHR() {
  const { k, perms, lang } = useOutletContext();
  const [tab, setTab] = useState("attendance");
  const [state, setState] = useState({ attendance: [], leaves: [], payroll: [], evaluations: [], bonuses: [], deductions: [], promotions: [], penalties: [] });
  const [employees, setEmployees] = useState([]);
  const canManage = perms.includes("hr.manage") || perms.includes("employees.manage");

  const load = useCallback(async () => {
    try {
      const emp = await osApi.get("/employees/lookup"); setEmployees(emp.data);
      const [a, l, e, pr] = await Promise.all([
        osApi.get("/hr/attendance").catch(()=>({data:[]})),
        osApi.get("/hr/leaves").catch(()=>({data:[]})),
        osApi.get("/hr/evaluations").catch(()=>({data:[]})),
        osApi.get("/hr/promotions").catch(()=>({data:[]})),
      ]);
      setState(s => ({ ...s, attendance: a.data, leaves: l.data, evaluations: e.data, promotions: pr.data }));
      if (canManage) {
        const [p, b, d, pen] = await Promise.all([
          osApi.get("/hr/payroll").catch(()=>({data:[]})),
          osApi.get("/hr/bonuses").catch(()=>({data:[]})),
          osApi.get("/hr/deductions").catch(()=>({data:[]})),
          osApi.get("/hr/penalties").catch(()=>({data:[]})),
        ]);
        setState(s => ({ ...s, payroll: p.data, bonuses: b.data, deductions: d.data, penalties: pen.data }));
      }
    } catch {}
  }, [canManage]);
  useEffect(() => { load(); }, [load]);

  const check = async (action) => {
    try { await osApi.post("/hr/attendance", { action }); toast.success(`${action} ✓`); load(); }
    catch { toast.error("Failed"); }
  };

  const empName = (id) => employees.find(e=>e.id===id)?.name || id?.slice(0,8);

  return (
    <div data-testid="os-hr" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Human Resources</h1>
          <p className={`mt-1 text-sm ${k.muted}`}>إدارة كاملة للموظفين — حضور، إجازات، رواتب، مكافآت، خصومات، ترقيات، وعقوبات.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>check("check_in")} data-testid="check-in-btn" className={`border ${k.ghost} rounded-md px-3 py-1.5 text-xs`}>Check in</button>
          <button onClick={()=>check("check_out")} data-testid="check-out-btn" className={`border ${k.ghost} rounded-md px-3 py-1.5 text-xs`}>Check out</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-current/10 pb-3">
        {TABS.map(tb => (
          <button key={tb.key} onClick={()=>setTab(tb.key)} data-testid={`hr-tab-${tb.key}`}
            className={`px-3 py-1.5 text-xs rounded-md border ${tab===tb.key?k.primary:k.ghost}`}>
            {lang === "ar" ? tb.label : tb.en}
          </button>
        ))}
      </div>

      {tab === "attendance" && <AttendanceTab data={state.attendance} k={k} />}
      {tab === "leaves" && <LeavesTab leaves={state.leaves} employees={employees} k={k} canManage={canManage} reload={load} empName={empName} />}
      {tab === "payroll" && canManage && <PayrollTab payroll={state.payroll} employees={employees} k={k} reload={load} empName={empName} />}
      {tab === "bonuses" && canManage && <BonusesTab bonuses={state.bonuses} employees={employees} k={k} reload={load} empName={empName} />}
      {tab === "deductions" && canManage && <DeductionsTab deductions={state.deductions} employees={employees} k={k} reload={load} empName={empName} />}
      {tab === "evaluations" && <EvalTab evals={state.evaluations} employees={employees} k={k} canManage={canManage} reload={load} empName={empName} />}
      {tab === "promotions" && <PromotionsTab promotions={state.promotions} employees={employees} k={k} canManage={canManage} reload={load} empName={empName} />}
      {tab === "penalties" && canManage && <PenaltiesTab penalties={state.penalties} employees={employees} k={k} reload={load} empName={empName} />}
      {tab === "positions" && <PositionsTab k={k} canManage={canManage} />}
      {tab === "roles" && canManage && <RolesTab k={k} />}
    </div>
  );
}

function PositionsTab({ k, canManage }) {
  const [positions, setPositions] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", department: "", description: "", requirements: "", is_open: true });
  const load = async () => { try { const r = await osApi.get("/hr/positions"); setPositions(r.data); } catch {} };
  useEffect(() => { load(); }, []);
  const submit = async (e) => { e.preventDefault(); try { await osApi.post("/hr/positions", f); toast.success("Position opened"); setOpen(false); setF({ title:"",department:"",description:"",requirements:"",is_open:true }); load(); } catch { toast.error("Failed"); } };
  const toggle = async (p) => { await osApi.patch(`/hr/positions/${p.id}`, { ...p, is_open: !p.is_open }); load(); };
  const remove = async (id) => { if(!window.confirm("Delete this position?")) return; await osApi.delete(`/hr/positions/${id}`); load(); };
  return <div>
    {canManage && <div className="flex justify-end mb-3">
      <button onClick={()=>setOpen(!open)} data-testid="new-position-btn" className={`${k.primary} rounded-md px-3 py-1.5 text-xs inline-flex items-center gap-1`}><Plus className="w-3 h-3" /> Open position</button>
    </div>}
    {open && <form onSubmit={submit} className={`border rounded-xl p-4 mb-3 ${k.cardBg} ${k.cardBorder} grid md:grid-cols-2 gap-2`}>
      <input required placeholder="Title (e.g., Senior Video Editor)" value={f.title} onChange={(e)=>setF({...f,title:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} data-testid="position-title" />
      <input placeholder="Department" value={f.department} onChange={(e)=>setF({...f,department:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <textarea placeholder="Description" rows={2} value={f.description} onChange={(e)=>setF({...f,description:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input} md:col-span-2`} />
      <textarea placeholder="Requirements" rows={2} value={f.requirements} onChange={(e)=>setF({...f,requirements:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input} md:col-span-2`} />
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" checked={f.is_open} onChange={(e)=>setF({...f,is_open:e.target.checked})} /> Open immediately (visible on /join-us)
      </label>
      <button type="submit" className={`${k.primary} rounded-md py-2 text-sm md:col-span-2`}>Save</button>
    </form>}
    <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} divide-y ${k.rowBorder} overflow-hidden`}>
      {positions.length === 0 ? <p className={`p-8 text-center text-sm ${k.muted}`}>لا توجد وظائف مفتوحة. اضغط Open position لفتح باب التوظيف.</p> :
        positions.map(p => <div key={p.id} className="p-4 flex items-start gap-3 group">
          <div className="flex-1">
            <div className="font-medium flex items-center gap-2">
              {p.title}
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${p.is_open?'text-emerald-500 border-emerald-500/30':'text-slate-400 border-current'}`}>{p.is_open?"OPEN":"CLOSED"}</span>
            </div>
            {p.department && <div className={`text-xs ${k.muted}`}>{p.department}</div>}
            {p.description && <div className="text-sm mt-1">{p.description}</div>}
          </div>
          {canManage && <div className="flex items-center gap-2">
            <button onClick={()=>toggle(p)} className={`text-xs ${k.muted} hover:underline`}>{p.is_open?"Close":"Reopen"}</button>
            <button onClick={()=>remove(p.id)} className={`opacity-0 group-hover:opacity-100 ${k.muted}`}><Trash2 className="w-3.5 h-3.5" /></button>
          </div>}
        </div>)}
    </div>
  </div>;
}

function RolesTab({ k }) {
  const [data, setData] = useState({ roles: [], permissions_catalog: {}, default_role_perms: {} });
  const [form, setForm] = useState({ name: "", permissions: [], description: "" });
  const [editing, setEditing] = useState(null);
  const load = async () => { try { const r = await osApi.get("/roles"); setData(r.data); } catch {} };
  useEffect(() => { load(); }, []);
  const startNew = () => { setEditing("__new__"); setForm({ name:"", permissions:[], description:"" }); };
  const startEdit = (r) => { setEditing(r.name); setForm({ name: r.name, permissions: r.permissions || [], description: r.description || "" }); };
  const togglePerm = (p) => setForm(f => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter(x=>x!==p) : [...f.permissions, p] }));
  const save = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error("Name required");
    try { await osApi.put(`/roles/${encodeURIComponent(form.name)}`, { permissions: form.permissions, description: form.description }); toast.success("Saved"); setEditing(null); load(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };
  const remove = async (name) => { if(!window.confirm(`Delete role "${name}"?`)) return; try { await osApi.delete(`/roles/${encodeURIComponent(name)}`); toast.success("Deleted"); load(); } catch (err) { toast.error(err.response?.data?.detail || "Failed"); } };
  const catalog = Object.entries(data.permissions_catalog);
  return <div>
    <div className="flex justify-end mb-3">
      <button onClick={startNew} data-testid="new-role-btn" className={`${k.primary} rounded-md px-3 py-1.5 text-xs inline-flex items-center gap-1`}><Plus className="w-3 h-3" /> New role</button>
    </div>
    {editing && (
      <form onSubmit={save} className={`border rounded-xl p-4 mb-3 ${k.cardBg} ${k.cardBorder} space-y-3`}>
        <div className="flex gap-2">
          <input required placeholder="Role name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} disabled={editing!=="__new__"} className={`flex-1 px-3 py-2 rounded-md border text-sm ${k.input}`} data-testid="role-name" />
          <input placeholder="Description" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className={`flex-1 px-3 py-2 rounded-md border text-sm ${k.input}`} />
        </div>
        <div>
          <div className={`text-[10px] font-mono tracking-[0.24em] uppercase mb-2 ${k.muted}`}>Permissions ({form.permissions.length})</div>
          <div className={`grid grid-cols-2 md:grid-cols-3 gap-1 max-h-72 overflow-y-auto border rounded-md p-2 ${k.cardBorder}`}>
            {catalog.map(([key, label]) => (
              <label key={key} className={`flex items-center gap-2 text-xs p-1.5 rounded ${form.permissions.includes(key)?k.accentSoft:''} ${k.hover}`}>
                <input type="checkbox" checked={form.permissions.includes(key)} onChange={()=>togglePerm(key)} />
                <span className="font-mono text-[10px] shrink-0">{key}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className={`${k.primary} rounded-md py-2 px-4 text-sm`} data-testid="save-role-btn">Save</button>
          <button type="button" onClick={()=>setEditing(null)} className={`border ${k.ghost} rounded-md py-2 px-4 text-sm`}>Cancel</button>
        </div>
      </form>
    )}
    <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} divide-y ${k.rowBorder} overflow-hidden`}>
      {data.roles.length === 0 ? <p className={`p-8 text-center text-sm ${k.muted}`}>No custom roles yet.</p> :
        data.roles.map(r => <div key={r.name} className="p-3 flex items-center gap-3 text-sm group">
          <div className="flex-1">
            <div className="font-medium">{r.name}</div>
            {r.description && <div className={`text-xs ${k.muted}`}>{r.description}</div>}
            <div className={`text-xs ${k.muted}`}>{(r.permissions||[]).length} permissions</div>
          </div>
          <button onClick={()=>startEdit(r)} className={`text-xs ${k.muted} hover:underline`}>Edit</button>
          <button onClick={()=>remove(r.name)} className={`opacity-0 group-hover:opacity-100 ${k.muted}`}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>)}
    </div>
  </div>;
}

function ListShell({ k, empty, children }) {
  return <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} divide-y ${k.rowBorder} overflow-hidden`}>
    {(!children || (Array.isArray(children) && children.length === 0)) ? <p className={`p-8 text-center text-sm ${k.muted}`}>{empty}</p> : children}
  </div>;
}

function AttendanceTab({ data, k }) {
  return <ListShell k={k} empty="No records">
    {data.map(a => <div key={a.id} className="p-3 flex items-center gap-3 text-sm">
      <span className="flex-1">{a.user_name}</span>
      <span className={`text-xs px-2 py-0.5 rounded ${a.action==='check_in'?'text-emerald-500':'text-orange-400'} border ${k.cardBorder}`}>{a.action}</span>
      <span className={`text-xs font-mono ${k.muted}`}>{new Date(a.created_at).toLocaleString()}</span>
    </div>)}
  </ListShell>;
}

function LeavesTab({ leaves, employees, k, canManage, reload, empName }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ user_id: "", from_date: "", to_date: "", reason: "", type: "annual" });
  const submit = async (e) => { e.preventDefault(); try { await osApi.post("/hr/leaves", form); toast.success("Requested"); setOpen(false); reload(); } catch { toast.error("Failed"); } };
  const setStatus = async (id, status) => { await osApi.patch(`/hr/leaves/${id}`, { status }); reload(); };
  return <div>
    <div className="flex justify-end mb-3">
      <button onClick={()=>setOpen(!open)} className={`${k.primary} rounded-md px-3 py-1.5 text-xs inline-flex items-center gap-1`}><Plus className="w-3 h-3" /> New leave</button>
    </div>
    {open && <form onSubmit={submit} className={`border rounded-xl p-4 mb-3 ${k.cardBg} ${k.cardBorder} grid md:grid-cols-5 gap-2`}>
      <select value={form.user_id} onChange={(e)=>setForm({...form,user_id:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`}>
        <option value="">Myself</option>{employees.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <input required type="date" value={form.from_date} onChange={(e)=>setForm({...form,from_date:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <input required type="date" value={form.to_date} onChange={(e)=>setForm({...form,to_date:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <input placeholder="Reason" value={form.reason} onChange={(e)=>setForm({...form,reason:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <button type="submit" className={`${k.primary} rounded-md py-2 text-sm`}>Submit</button>
    </form>}
    <ListShell k={k} empty="No requests">
      {leaves.map(l => <div key={l.id} className="p-3 flex items-center gap-3 text-sm">
        <div className="flex-1">
          <div className="font-medium">{empName(l.user_id)}</div>
          <div className={`text-xs ${k.muted}`}>{l.from_date} → {l.to_date} · {l.reason}</div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${l.status==='approved'?'text-emerald-500':l.status==='rejected'?'text-red-400':'text-yellow-400'} border ${k.cardBorder}`}>{l.status}</span>
        {canManage && <div className="flex gap-1">
          <button onClick={()=>setStatus(l.id, "approved")} className="text-xs text-emerald-500 hover:underline">Approve</button>
          <button onClick={()=>setStatus(l.id, "rejected")} className="text-xs text-red-400 hover:underline">Reject</button>
        </div>}
      </div>)}
    </ListShell>
  </div>;
}

function PayrollTab({ payroll, employees, k, reload, empName }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ user_id: "", month: "", base: 0, bonus: 0, deduction: 0 });
  const submit = async (e) => { e.preventDefault(); try { await osApi.post("/hr/payroll", {...f, base: +f.base, bonus: +f.bonus, deduction: +f.deduction }); toast.success("Added"); setOpen(false); reload(); } catch { toast.error("Failed"); } };
  return <div>
    <div className="flex justify-end mb-3">
      <button onClick={()=>setOpen(!open)} className={`${k.primary} rounded-md px-3 py-1.5 text-xs inline-flex items-center gap-1`}><Plus className="w-3 h-3" /> Add payroll</button>
    </div>
    {open && <form onSubmit={submit} className={`border rounded-xl p-4 mb-3 ${k.cardBg} ${k.cardBorder} grid md:grid-cols-6 gap-2`}>
      <select required value={f.user_id} onChange={(e)=>setF({...f,user_id:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input} md:col-span-2`}>
        <option value="">Employee</option>{employees.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <input required placeholder="YYYY-MM" value={f.month} onChange={(e)=>setF({...f,month:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <input required type="number" placeholder="Base" value={f.base} onChange={(e)=>setF({...f,base:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <input type="number" placeholder="Bonus" value={f.bonus} onChange={(e)=>setF({...f,bonus:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <button type="submit" className={`${k.primary} rounded-md py-2 text-sm`}>Save</button>
    </form>}
    <ListShell k={k} empty="No payroll">
      {payroll.map(p => <div key={p.id} className="p-3 flex items-center gap-4 text-sm">
        <div className="flex-1 font-medium">{empName(p.user_id)}</div>
        <span className={`text-xs ${k.muted}`}>{p.month}</span>
        <span className="font-mono">${p.base}</span>
        <span className="font-mono text-emerald-500">+${p.bonus}</span>
        <span className="font-mono text-red-400">-${p.deduction}</span>
        <span className="font-mono font-bold">= ${p.net}</span>
      </div>)}
    </ListShell>
  </div>;
}

function BonusesTab({ bonuses, employees, k, reload, empName }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ user_id: "", amount: 0, reason: "", month: "" });
  const submit = async (e) => { e.preventDefault(); try { await osApi.post("/hr/bonuses", {...f, amount: +f.amount}); toast.success("Bonus added 🎉"); setOpen(false); setF({user_id:"",amount:0,reason:"",month:""}); reload(); } catch { toast.error("Failed"); } };
  const remove = async (id) => { if(!window.confirm("Delete?")) return; await osApi.delete(`/hr/bonuses/${id}`); reload(); };
  return <div>
    <div className="flex justify-end mb-3">
      <button onClick={()=>setOpen(!open)} data-testid="new-bonus-btn" className={`${k.primary} rounded-md px-3 py-1.5 text-xs inline-flex items-center gap-1`}><Plus className="w-3 h-3" /> Grant bonus</button>
    </div>
    {open && <form onSubmit={submit} className={`border rounded-xl p-4 mb-3 ${k.cardBg} ${k.cardBorder} grid md:grid-cols-5 gap-2`}>
      <select required value={f.user_id} onChange={(e)=>setF({...f,user_id:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input} md:col-span-2`}>
        <option value="">Employee</option>{employees.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <input required type="number" placeholder="Amount" value={f.amount} onChange={(e)=>setF({...f,amount:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <input placeholder="Reason" value={f.reason} onChange={(e)=>setF({...f,reason:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <button type="submit" className={`${k.primary} rounded-md py-2 text-sm`}>Save</button>
    </form>}
    <ListShell k={k} empty="No bonuses">
      {bonuses.map(b => <div key={b.id} className="p-3 flex items-center gap-4 text-sm group">
        <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
        <div className="flex-1"><div className="font-medium">{empName(b.user_id)}</div><div className={`text-xs ${k.muted}`}>{b.reason}</div></div>
        <span className={`text-xs ${k.muted}`}>{b.month}</span>
        <span className="font-mono font-bold text-emerald-500">+${b.amount}</span>
        <button onClick={()=>remove(b.id)} className={`opacity-0 group-hover:opacity-100 ${k.muted}`}><Trash2 className="w-3.5 h-3.5" /></button>
      </div>)}
    </ListShell>
  </div>;
}

function DeductionsTab({ deductions, employees, k, reload, empName }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ user_id: "", amount: 0, reason: "", month: "" });
  const submit = async (e) => { e.preventDefault(); try { await osApi.post("/hr/deductions", {...f, amount: +f.amount}); toast.success("Deduction added"); setOpen(false); setF({user_id:"",amount:0,reason:"",month:""}); reload(); } catch { toast.error("Failed"); } };
  const remove = async (id) => { if(!window.confirm("Delete?")) return; await osApi.delete(`/hr/deductions/${id}`); reload(); };
  return <div>
    <div className="flex justify-end mb-3">
      <button onClick={()=>setOpen(!open)} data-testid="new-deduction-btn" className={`${k.primary} rounded-md px-3 py-1.5 text-xs inline-flex items-center gap-1`}><Plus className="w-3 h-3" /> Add deduction</button>
    </div>
    {open && <form onSubmit={submit} className={`border rounded-xl p-4 mb-3 ${k.cardBg} ${k.cardBorder} grid md:grid-cols-5 gap-2`}>
      <select required value={f.user_id} onChange={(e)=>setF({...f,user_id:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input} md:col-span-2`}>
        <option value="">Employee</option>{employees.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <input required type="number" placeholder="Amount" value={f.amount} onChange={(e)=>setF({...f,amount:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <input placeholder="Reason" value={f.reason} onChange={(e)=>setF({...f,reason:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <button type="submit" className={`${k.primary} rounded-md py-2 text-sm`}>Save</button>
    </form>}
    <ListShell k={k} empty="No deductions">
      {deductions.map(d => <div key={d.id} className="p-3 flex items-center gap-4 text-sm group">
        <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />
        <div className="flex-1"><div className="font-medium">{empName(d.user_id)}</div><div className={`text-xs ${k.muted}`}>{d.reason}</div></div>
        <span className={`text-xs ${k.muted}`}>{d.month}</span>
        <span className="font-mono font-bold text-red-400">-${d.amount}</span>
        <button onClick={()=>remove(d.id)} className={`opacity-0 group-hover:opacity-100 ${k.muted}`}><Trash2 className="w-3.5 h-3.5" /></button>
      </div>)}
    </ListShell>
  </div>;
}

function EvalTab({ evals, employees, k, canManage, reload, empName }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ user_id: "", month: "", score: 5, notes: "" });
  const submit = async (e) => { e.preventDefault(); try { await osApi.post("/hr/evaluations", {...f, score: +f.score}); toast.success("Saved"); setOpen(false); reload(); } catch { toast.error("Failed"); } };
  return <div>
    {canManage && <div className="flex justify-end mb-3">
      <button onClick={()=>setOpen(!open)} className={`${k.primary} rounded-md px-3 py-1.5 text-xs inline-flex items-center gap-1`}><Plus className="w-3 h-3" /> New evaluation</button>
    </div>}
    {open && <form onSubmit={submit} className={`border rounded-xl p-4 mb-3 ${k.cardBg} ${k.cardBorder} grid md:grid-cols-5 gap-2`}>
      <select required value={f.user_id} onChange={(e)=>setF({...f,user_id:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input} md:col-span-2`}>
        <option value="">Employee</option>{employees.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <input required placeholder="YYYY-MM" value={f.month} onChange={(e)=>setF({...f,month:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <input required type="number" min={1} max={10} value={f.score} onChange={(e)=>setF({...f,score:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <button type="submit" className={`${k.primary} rounded-md py-2 text-sm`}>Save</button>
    </form>}
    <ListShell k={k} empty="No evaluations">
      {evals.map(e => <div key={e.id} className="p-3 flex items-center gap-4 text-sm">
        <div className="flex-1 font-medium">{empName(e.user_id)}</div>
        <span className={`text-xs ${k.muted}`}>{e.month}</span>
        <span className="font-mono font-bold">{e.score}/10</span>
        <span className={`text-xs truncate max-w-xs ${k.muted}`}>{e.notes}</span>
      </div>)}
    </ListShell>
  </div>;
}

function PromotionsTab({ promotions, employees, k, canManage, reload, empName }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ user_id: "", to_role: "", effective_date: "", salary_change: 0, notes: "" });
  const submit = async (e) => { e.preventDefault(); try { await osApi.post("/hr/promotions", {...f, salary_change: +f.salary_change}); toast.success("Promoted 🚀"); setOpen(false); setF({user_id:"",to_role:"",effective_date:"",salary_change:0,notes:""}); reload(); } catch { toast.error("Failed"); } };
  const remove = async (id) => { if(!window.confirm("Delete promotion record?")) return; await osApi.delete(`/hr/promotions/${id}`); reload(); };
  return <div>
    {canManage && <div className="flex justify-end mb-3">
      <button onClick={()=>setOpen(!open)} data-testid="new-promotion-btn" className={`${k.primary} rounded-md px-3 py-1.5 text-xs inline-flex items-center gap-1`}><Plus className="w-3 h-3" /> Promote</button>
    </div>}
    {open && <form onSubmit={submit} className={`border rounded-xl p-4 mb-3 ${k.cardBg} ${k.cardBorder} grid md:grid-cols-5 gap-2`}>
      <select required value={f.user_id} onChange={(e)=>setF({...f,user_id:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`}>
        <option value="">Employee</option>{employees.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <select required value={f.to_role} onChange={(e)=>setF({...f,to_role:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`}>
        <option value="">→ New role</option>{ROLES.map(r=><option key={r} value={r}>{r}</option>)}
      </select>
      <input required type="date" value={f.effective_date} onChange={(e)=>setF({...f,effective_date:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <input type="number" placeholder="Salary change" value={f.salary_change} onChange={(e)=>setF({...f,salary_change:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <button type="submit" className={`${k.primary} rounded-md py-2 text-sm`}>Save</button>
    </form>}
    <ListShell k={k} empty="No promotions">
      {promotions.map(p => <div key={p.id} className="p-3 flex items-center gap-4 text-sm group">
        <ArrowUp className="w-4 h-4 text-emerald-500 shrink-0" />
        <div className="flex-1"><div className="font-medium">{empName(p.user_id)}</div><div className={`text-xs ${k.muted}`}>{p.from_role || "—"} → <span className="text-emerald-500">{p.to_role}</span></div></div>
        <span className={`text-xs ${k.muted}`}>{p.effective_date}</span>
        {p.salary_change > 0 && <span className="font-mono text-emerald-500">+${p.salary_change}</span>}
        {canManage && <button onClick={()=>remove(p.id)} className={`opacity-0 group-hover:opacity-100 ${k.muted}`}><Trash2 className="w-3.5 h-3.5" /></button>}
      </div>)}
    </ListShell>
  </div>;
}

function PenaltiesTab({ penalties, employees, k, reload, empName }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ user_id: "", type: "warning", severity: "low", reason: "", amount: 0 });
  const submit = async (e) => { e.preventDefault(); try { await osApi.post("/hr/penalties", {...f, amount: +f.amount}); toast.success("Recorded"); setOpen(false); setF({user_id:"",type:"warning",severity:"low",reason:"",amount:0}); reload(); } catch { toast.error("Failed"); } };
  const remove = async (id) => { if(!window.confirm("Delete penalty record?")) return; await osApi.delete(`/hr/penalties/${id}`); reload(); };
  const toggle = async (id) => { await osApi.patch(`/hr/penalties/${id}`); reload(); };
  const sev = { low: "text-yellow-400", medium: "text-orange-400", high: "text-red-500" };
  return <div>
    <div className="flex justify-end mb-3">
      <button onClick={()=>setOpen(!open)} data-testid="new-penalty-btn" className={`${k.primary} rounded-md px-3 py-1.5 text-xs inline-flex items-center gap-1`}><Plus className="w-3 h-3" /> Record penalty</button>
    </div>
    {open && <form onSubmit={submit} className={`border rounded-xl p-4 mb-3 ${k.cardBg} ${k.cardBorder} grid md:grid-cols-6 gap-2`}>
      <select required value={f.user_id} onChange={(e)=>setF({...f,user_id:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`}>
        <option value="">Employee</option>{employees.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <select value={f.type} onChange={(e)=>setF({...f,type:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`}>
        {["warning","fine","suspension","termination"].map(t=><option key={t} value={t}>{t}</option>)}
      </select>
      <select value={f.severity} onChange={(e)=>setF({...f,severity:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`}>
        {["low","medium","high"].map(s=><option key={s} value={s}>{s}</option>)}
      </select>
      <input required placeholder="Reason" value={f.reason} onChange={(e)=>setF({...f,reason:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <input type="number" placeholder="Fine" value={f.amount} onChange={(e)=>setF({...f,amount:e.target.value})} className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
      <button type="submit" className={`${k.primary} rounded-md py-2 text-sm`}>Save</button>
    </form>}
    <ListShell k={k} empty="No penalties on record — good work!">
      {penalties.map(p => <div key={p.id} className="p-3 flex items-center gap-4 text-sm group">
        <AlertTriangle className={`w-4 h-4 ${sev[p.severity]} shrink-0`} />
        <div className="flex-1">
          <div className="font-medium flex items-center gap-2">
            {empName(p.user_id)}
            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${k.cardBorder}`}>{p.type}</span>
            <span className={`text-[10px] uppercase ${sev[p.severity]}`}>{p.severity}</span>
            {!p.active && <span className={`text-[10px] uppercase ${k.muted}`}>· inactive</span>}
          </div>
          <div className={`text-xs ${k.muted}`}>{p.reason}</div>
        </div>
        {p.amount > 0 && <span className="font-mono text-red-400">-${p.amount}</span>}
        <button onClick={()=>toggle(p.id)} className={`text-xs ${k.muted} hover:underline`}>{p.active?"Deactivate":"Reactivate"}</button>
        <button onClick={()=>remove(p.id)} className={`opacity-0 group-hover:opacity-100 ${k.muted}`}><Trash2 className="w-3.5 h-3.5" /></button>
      </div>)}
    </ListShell>
  </div>;
}
