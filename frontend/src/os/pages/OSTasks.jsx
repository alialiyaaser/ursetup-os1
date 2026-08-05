import React, { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { osApi } from "../api";

const PRIORITY_COLOR = {
  low: "border-slate-400/30 text-slate-400",
  medium: "border-blue-400/40 text-blue-400",
  high: "border-orange-400/40 text-orange-400",
  urgent: "border-red-400/50 text-red-400",
};
const COLUMNS = [{ key: "todo", label: "To do" }, { key: "in_progress", label: "In progress" }, { key: "done", label: "Done" }];

export default function OSTasks() {
  const { user, t, k, perms } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "", priority: "medium", due_at: "", progress: 0, status: "todo" });
  const [showForm, setShowForm] = useState(false);
  const canAssign = perms.includes("tasks.assign");

  const load = useCallback(async () => {
    try {
      const [tk, emp] = await Promise.all([
        osApi.get("/tasks/all"),
        osApi.get("/employees/lookup"),
      ]);
      setTasks(tk.data); setEmployees(emp.data);
    } catch {}
  }, []);

  useEffect(() => { load(); const iv = setInterval(load, 10000); return () => clearInterval(iv); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await osApi.post("/tasks/full", { ...form, progress: Number(form.progress) || 0 });
      toast.success(t.common.created);
      setForm({ title: "", description: "", assigned_to: "", priority: "medium", due_at: "", progress: 0, status: "todo" });
      setShowForm(false);
      load();
    } catch { toast.error(t.common.failed); }
  };

  const setStatus = async (task, status) => {
    try { await osApi.patch(`/tasks/${task.id}`, { done: status === "done" }); await osApi.patch(`/tasks/${task.id}`, { title: task.title, done: status === "done" }); load(); }
    catch {}
  };

  const remove = async (id) => { await osApi.delete(`/tasks/${id}`); load(); };

  return (
    <div data-testid="os-tasks" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Tasks</h1>
          <p className={`mt-1 text-sm ${k.muted}`}>إدارة المهام والأولويات.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} data-testid="new-task-btn"
          className={`${k.primary} rounded-md px-4 py-2 text-sm inline-flex items-center gap-2`}>
          <Plus className="w-4 h-4" /> New task
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className={`border rounded-xl p-5 ${k.cardBg} ${k.cardBorder} grid md:grid-cols-2 gap-3`}>
          <input required placeholder="Title" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} data-testid="task-title"
            className={`px-3 py-2 rounded-md border text-sm ${k.input} md:col-span-2`} />
          <textarea placeholder="Description" rows={2} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}
            className={`px-3 py-2 rounded-md border text-sm ${k.input} md:col-span-2`} />
          {canAssign && (
            <select value={form.assigned_to} onChange={(e)=>setForm({...form,assigned_to:e.target.value})}
              className={`px-3 py-2 rounded-md border text-sm ${k.input}`}>
              <option value="">Assign to me</option>
              {employees.filter(e=>e.id!==user.id).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}
          <select value={form.priority} onChange={(e)=>setForm({...form,priority:e.target.value})}
            className={`px-3 py-2 rounded-md border text-sm ${k.input}`}>
            {["low","medium","high","urgent"].map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <input type="date" value={form.due_at} onChange={(e)=>setForm({...form,due_at:e.target.value})}
            className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
          <input type="number" min={0} max={100} placeholder="Progress %" value={form.progress} onChange={(e)=>setForm({...form,progress:e.target.value})}
            className={`px-3 py-2 rounded-md border text-sm ${k.input}`} />
          <button type="submit" data-testid="task-submit" className={`${k.primary} rounded-md py-2 text-sm md:col-span-2`}>Create</button>
        </form>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const items = tasks.filter(t => (col.key === "done" ? t.done : t.status === col.key && !t.done));
          return (
            <div key={col.key} className={`border rounded-xl p-4 ${k.cardBg} ${k.cardBorder}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>{col.label}</span>
                <span className={`text-xs font-mono ${k.muted}`}>{items.length}</span>
              </div>
              <div className="space-y-2 min-h-[60px]">
                {items.length === 0 && <p className={`text-xs text-center py-6 ${k.muted}`}>No tasks</p>}
                {items.map(t => {
                  const a = employees.find(e=>e.id===t.assigned_to);
                  return (
                    <div key={t.id} className={`p-3 rounded-md border ${k.cardBorder} ${k.hover} group`} data-testid={`task-${t.id}`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="font-medium text-sm">{t.title}</div>
                        <button onClick={()=>remove(t.id)} className={`opacity-0 group-hover:opacity-100 ${k.muted}`}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      {t.description && <div className={`text-xs mb-2 ${k.muted} line-clamp-2`}>{t.description}</div>}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] uppercase font-medium px-1.5 py-0.5 rounded border ${PRIORITY_COLOR[t.priority]||PRIORITY_COLOR.medium}`}>{t.priority}</span>
                        {t.due_at && <span className={`text-[10px] font-mono ${k.muted}`}>{t.due_at}</span>}
                        {a && <span className={`text-[10px] ms-auto ${k.muted}`}>{a.name?.split(" ")[0]}</span>}
                      </div>
                      <div className="mt-2 flex gap-2">
                        {COLUMNS.filter(c=>c.key!==col.key).map(c=>(
                          <button key={c.key} onClick={()=>setStatus(t,c.key)}
                            className={`text-[10px] ${k.muted} hover:${k.shellText}`}>→ {c.label}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
