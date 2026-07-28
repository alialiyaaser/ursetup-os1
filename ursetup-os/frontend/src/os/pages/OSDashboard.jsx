import React, { useEffect, useState, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ShoppingBag, DollarSign, UserPlus, Clock, Users, Activity,
  Plus, Check, ListTodo, ArrowUpRight, UserCog, ScrollText, Circle,
  Plug, ExternalLink, X,
} from "lucide-react";
import { osApi } from "../api";
import { greetKey, formatRelative } from "../i18n";

function Card({ children, className = "", k, testId }) {
  return (
    <div data-testid={testId}
      className={`border rounded-xl p-5 transition-all duration-200 ${k.cardBg} ${k.cardBorder} ${k.dark ? "hover:border-white/15" : "hover:border-[#D6D3D0] shadow-sm"} ${className}`}>
      {children}
    </div>
  );
}

function MetricCard({ label, value, Icon, sub, k, testId }) {
  return (
    <Card k={k} testId={testId}>
      <div className="flex items-start justify-between mb-3">
        <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>{label}</p>
        <Icon className={`w-4 h-4 ${k.muted}`} />
      </div>
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      {sub && <p className={`text-xs mt-1 ${k.muted}`}>{sub}</p>}
    </Card>
  );
}

export default function OSDashboard() {
  const { user, t, lang, k, perms } = useOutletContext();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [onlineList, setOnlineList] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [showAssign, setShowAssign] = useState(false);

  const canSeeOnline = perms.includes("logs.view");
  const canAssign = perms.includes("tasks.assign");

  const load = useCallback(async () => {
    try {
      const [s, tk, a, emp] = await Promise.all([
        osApi.get("/dashboard/summary"),
        osApi.get("/tasks"),
        osApi.get("/dashboard/recent-activity"),
        canAssign ? osApi.get("/employees/lookup") : Promise.resolve({ data: [] }),
      ]);
      setSummary(s.data); setTasks(tk.data); setActivity(a.data);
      setEmployees(emp.data.filter((u) => u.id !== user.id));
      if (canSeeOnline) {
        const o = await osApi.get("/dashboard/online-employees");
        setOnlineList(o.data);
      }
    } catch (e) { /* ignore */ }
  }, [canSeeOnline, canAssign, user.id]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 10s so orders/customers/activity feel LIVE.
  // When Salla is connected later, this same polling picks up new orders automatically.
  useEffect(() => {
    const int = setInterval(load, 10000);
    return () => clearInterval(int);
  }, [load]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      await osApi.post("/tasks", { title: taskTitle.trim(), assigned_to: assignedTo || null });
      setTaskTitle(""); setAssignedTo(""); setShowAssign(false);
      toast.success(t.common.created);
      load();
    } catch { toast.error(t.common.failed); }
  };

  const toggleTask = async (task) => {
    try { await osApi.patch(`/tasks/${task.id}`, { done: !task.done }); load(); }
    catch { toast.error(t.common.failed); }
  };

  const deleteTask = async (id) => {
    try { await osApi.delete(`/tasks/${id}`); load(); toast.success(t.common.deleted); }
    catch { toast.error(t.common.failed); }
  };

  const greet = t.greeting[greetKey()];
  const firstName = (user.name || user.email || "").split(" ")[0];

  return (
    <div data-testid="os-dashboard" className="space-y-8">
      <div>
        <p className={`text-[10px] font-mono tracking-[0.24em] uppercase mb-2 ${k.muted}`}>
          {new Date().toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{greet}, {firstName}</h1>
        <p className={`mt-1 text-sm ${k.muted}`}>{t.dashboard.today_summary}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label={t.dashboard.orders} value={summary?.orders_today ?? "—"} Icon={ShoppingBag} sub={t.dashboard.coming} k={k} testId="metric-orders" />
        <MetricCard label={t.dashboard.revenue} value={summary?.revenue_today ?? "—"} Icon={DollarSign} sub={t.dashboard.coming} k={k} testId="metric-revenue" />
        <MetricCard label={t.dashboard.new_customers} value={summary?.new_customers ?? "—"} Icon={UserPlus} sub={t.dashboard.coming} k={k} testId="metric-customers" />
        <MetricCard label={t.dashboard.pending} value={summary?.pending_orders ?? "—"} Icon={Clock} sub={t.dashboard.coming} k={k} testId="metric-pending" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick actions */}
        <Card k={k} className="lg:col-span-1">
          <p className={`text-[10px] font-mono tracking-[0.24em] uppercase mb-4 ${k.muted}`}>{t.dashboard.quick}</p>
          <div className="space-y-2">
            <button onClick={() => document.getElementById("os-task-input")?.focus()} data-testid="quick-add-task"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md border ${k.ghost} transition-colors duration-200 text-sm`}>
              <span className="inline-flex items-center gap-2"><Plus className="w-4 h-4" /> {t.dashboard.quick_add_task}</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
            </button>
            {perms.includes("employees.manage") && (
              <button onClick={() => navigate("/os/employees")} data-testid="quick-add-employee"
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md border ${k.ghost} transition-colors duration-200 text-sm`}>
                <span className="inline-flex items-center gap-2"><UserCog className="w-4 h-4" /> {t.dashboard.quick_add_employee}</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            )}
            {perms.includes("logs.view") && (
              <button onClick={() => navigate("/os/logs")} data-testid="quick-open-logs"
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md border ${k.ghost} transition-colors duration-200 text-sm`}>
                <span className="inline-flex items-center gap-2"><ScrollText className="w-4 h-4" /> {t.dashboard.quick_open_logs}</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            )}
          </div>
          <div className={`mt-6 pt-4 border-t ${k.rowBorder} space-y-2`}>
            <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>{t.dashboard.integrations}</p>
            {["salla", "whatsapp", "email"].map((key) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 capitalize">
                  <Plug className={`w-3.5 h-3.5 ${k.muted}`} />{key}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${k.chip}`}>{t.dashboard.not_connected}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Tasks */}
        <Card k={k} className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>{t.dashboard.tasks}</p>
            <ListTodo className={`w-4 h-4 ${k.muted}`} />
          </div>
          <form onSubmit={addTask} className="space-y-2 mb-3">
            <div className="flex gap-2">
              <input id="os-task-input" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)}
                placeholder={t.dashboard.quick_add_task} data-testid="task-input"
                className={`flex-1 px-3 py-2 rounded-md border text-sm ${k.input} ${k.ring} transition-colors duration-200`} />
              <button type="submit" data-testid="task-add-btn"
                className={`${k.primary} text-sm px-3 rounded-md transition-colors duration-200 inline-flex items-center`}><Plus className="w-4 h-4" /></button>
            </div>
            {canAssign && (
              <div>
                {!showAssign ? (
                  <button type="button" onClick={() => setShowAssign(true)} data-testid="task-assign-toggle"
                    className={`text-xs ${k.muted} hover:${k.shellText} inline-flex items-center gap-1 transition-colors duration-200`}>
                    <UserPlus className="w-3 h-3" /> {t.dashboard.assign_task}
                  </button>
                ) : (
                  <div className="flex gap-2 items-center">
                    <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
                      data-testid="task-assignee"
                      className={`flex-1 px-2 py-1.5 rounded-md border text-xs ${k.input}`}>
                      <option value="">{t.dashboard.assign_to_me}</option>
                      {employees.map((e2) => (
                        <option key={e2.id} value={e2.id}>{e2.name} · {e2.role}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => { setShowAssign(false); setAssignedTo(""); }}
                      className={`text-xs ${k.muted}`}><X className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            )}
          </form>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {tasks.length === 0 && <p className={`text-xs ${k.muted}`}>{t.dashboard.no_tasks}</p>}
            {tasks.map((task) => (
              <div key={task.id} data-testid={`task-${task.id}`}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-md group transition-colors duration-200 ${k.hover}`}>
                <button onClick={() => toggleTask(task)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${task.done ? (k.dark ? "bg-white border-white" : "bg-black border-black") : k.dark ? "border-white/25" : "border-slate-300"}`}>
                  {task.done && <Check className={`w-3 h-3 ${k.dark ? "text-black" : "text-white"}`} />}
                </button>
                <span className={`text-sm flex-1 ${task.done ? "line-through opacity-60" : ""}`}>{task.title}</span>
                {task.assigned_to !== user.id && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${k.chip}`}>
                    → {(employees.find((e3) => e3.id === task.assigned_to)?.name || "…").split(" ")[0]}
                  </span>
                )}
                <button onClick={() => deleteTask(task.id)} className={`opacity-0 group-hover:opacity-100 text-xs ${k.muted} transition-opacity`}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Activity / Online */}
        <Card k={k} className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>
              {canSeeOnline ? t.dashboard.online : t.dashboard.recent}
            </p>
            {canSeeOnline ? <Users className={`w-4 h-4 ${k.muted}`} /> : <Activity className={`w-4 h-4 ${k.muted}`} />}
          </div>
          {canSeeOnline ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {onlineList.length === 0 && <p className={`text-xs ${k.muted}`}>—</p>}
              {onlineList.map((u) => (
                <div key={u.id} className="flex items-center gap-2" data-testid={`online-${u.id}`}>
                  <Circle className={`w-2 h-2 ${k.online}`} />
                  <span className="text-sm">{u.name}</span>
                  <span className={`text-xs ${k.muted}`}>· {u.role}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {activity.length === 0 && <p className={`text-xs ${k.muted}`}>{t.dashboard.no_activity}</p>}
              {activity.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{a.action.replace(/_/g, " ")}</p>
                    <p className={`text-xs ${k.muted}`}>{a.module}</p>
                  </div>
                  <span className={`text-[10px] font-mono ${k.muted} shrink-0`}>{formatRelative(a.created_at, lang)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {canSeeOnline && (
        <Card k={k}>
          <div className="flex items-center justify-between mb-4">
            <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>{t.dashboard.recent}</p>
            <a href="/os/logs" className={`text-xs inline-flex items-center gap-1 ${k.muted} hover:${k.shellText}`}>
              {t.nav.logs} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-2">
            {activity.slice(0, 6).map((a) => (
              <div key={a.id} className={`flex items-center justify-between gap-3 py-2 border-b last:border-0 ${k.rowBorder}`}>
                <div className="min-w-0 flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full ${k.accentSoft} flex items-center justify-center text-xs font-semibold`}>
                    {(a.user_name || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{a.user_name}</span>{" "}
                      <span className={k.muted}>· {a.action.replace(/_/g, " ")}</span>
                    </p>
                    <p className={`text-xs ${k.muted}`}>{a.module}{a.target ? ` · ${a.target.slice(0, 8)}` : ""}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono ${k.muted}`}>{formatRelative(a.created_at, lang)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
