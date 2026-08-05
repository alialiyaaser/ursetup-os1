import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend  } from "recharts";
import { osApi } from "../api";

const COLORS = ["#FAFAFA","#A3A3A3","#71717A","#3F3F46","#525252","#737373","#525B67"];

export default function OSAnalytics() {
  const { k } = useOutletContext();
  const [summary, setSummary] = useState(null);
  useEffect(() => { osApi.get("/reports/summary").then(r => setSummary(r.data)).catch(()=>{}); }, []);

  const asData = (obj) => obj ? Object.entries(obj).map(([name, value]) => ({ name, value })) : [];

  return (
    <div data-testid="os-analytics" className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Analytics & Reports</h1>
        <p className={`mt-1 text-sm ${k.muted}`}>لوحة إحصائيات شاملة.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Team" value={summary?.users_total} sub={`${summary?.users_online||0} online`} k={k} />
        <Metric label="Tasks" value={summary?.tasks_total} sub={`${summary?.tasks_done||0} done`} k={k} />
        <Metric label="Applications" value={summary?.applications_total} sub={`${summary?.applications_waiting||0} waiting`} k={k} />
        <Metric label="Social posts" value={summary?.social_posts} sub={`${summary?.events_total||0} events`} k={k} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Activity trend (7 days)" k={k}>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={summary?.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={k.dark ? "#27272A" : "#E7E5E4"} />
              <XAxis dataKey="day" stroke={k.dark ? "#8A8A8E" : "#6B6968"} fontSize={11} tickFormatter={(v)=>v.slice(5)} />
              <YAxis stroke={k.dark ? "#8A8A8E" : "#6B6968"} fontSize={11} />
              <Tooltip contentStyle={{ background: k.dark ? "#141416" : "#fff", border: `1px solid ${k.dark?"#27272A":"#E7E5E4"}`, borderRadius: 6, fontSize: 12 }} />
              <Line type="monotone" dataKey="activity" stroke={k.dark ? "#FAFAFA" : "#0A0A0B"} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Team by role" k={k}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={asData(summary?.by_role)} dataKey="value" nameKey="name" outerRadius={80} label={{ fontSize: 10 }}>
                {asData(summary?.by_role).map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}

function Metric({ label, value, sub, k }) {
  return <div className={`border rounded-xl p-5 ${k.cardBg} ${k.cardBorder}`}>
    <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>{label}</p>
    <p className="text-3xl font-semibold tracking-tight mt-2">{value ?? "—"}</p>
    <p className={`text-xs ${k.muted}`}>{sub}</p>
  </div>;
}

function Panel({ title, k, children }) {
  return <div className={`border rounded-xl p-5 ${k.cardBg} ${k.cardBorder}`}>
    <p className={`text-[10px] font-mono tracking-[0.24em] uppercase mb-4 ${k.muted}`}>{title}</p>
    {children}
  </div>;
}
