import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { osApi } from "../api";
import { formatRelative } from "../i18n";

export default function OSLogs() {
  const { t, lang, k } = useOutletContext();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const load = () => osApi.get("/activity-logs").then((r) => setRows(r.data)).catch(() => setRows([]));
    load();
    const int = setInterval(load, 8000); // live activity feed
    return () => clearInterval(int);
  }, []);

  return (
    <div data-testid="os-logs" className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.logs.title}</h1>
        <p className={`mt-1 text-sm ${k.muted}`}>{t.logs.subtitle}</p>
      </div>

      <div className={`border rounded-xl overflow-x-auto ${k.cardBg} ${k.cardBorder}`}>
        {rows.length === 0 ? (
          <p className={`p-8 text-center text-sm ${k.muted}`}>{t.logs.empty}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className={k.tableHead}>
              <tr className="text-[10px] font-mono tracking-[0.2em] uppercase">
                <th className="text-start px-4 py-3">{t.logs.when}</th>
                <th className="text-start px-4 py-3">{t.logs.who}</th>
                <th className="text-start px-4 py-3">{t.logs.what}</th>
                <th className="text-start px-4 py-3">{t.logs.module}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className={`border-t ${k.rowBorder}`} data-testid={`log-${a.id}`}>
                  <td className={`px-4 py-3 text-xs font-mono ${k.muted} whitespace-nowrap`}>
                    {formatRelative(a.created_at, lang)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full ${k.logoBg} flex items-center justify-center text-xs font-semibold`}>
                        {(a.user_name || "?").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm">{a.user_name}</p>
                        <p className={`text-xs ${k.muted}`}>{a.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-1 rounded-md ${k.chip}`}>{a.action.replace(/_/g, " ")}</span>
                    {a.target && <span className={`ms-2 text-[10px] font-mono ${k.muted}`}>{String(a.target).slice(0, 12)}</span>}
                  </td>
                  <td className={`px-4 py-3 text-xs ${k.subtle}`}>{a.module}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
