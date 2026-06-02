"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import Loading from "@/components/Loading";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/audit-logs").then((res) => res.json()).then((data) => {
      setLogs(data.logs || []);
      setError(data.error || "");
    });
  }, []);

  if (!logs && !error) return <Loading label="Loading audit logs..." />;

  return (
    <div className="page-container">
      <h1 className="text-3xl font-black text-slate-950">Audit Logs</h1>
      <p className="mt-2 text-slate-500">Owner/Admin history for sensitive actions.</p>
      {error ? <div className="mt-6"><EmptyState title="No access" message={error} /></div> : null}
      {!error ? (
        <div className="mt-8 grid gap-3">
          {logs.length ? logs.map((log) => (
            <article key={log._id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                <div>
                  <p className="font-bold text-slate-950">{log.action}</p>
                  <p className="mt-1 text-sm text-slate-500">{log.userId?.name || "System"} - {log.entityType} - {new Date(log.createdAt).toLocaleString()}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{log.entityId}</span>
              </div>
            </article>
          )) : <EmptyState title="No audit logs yet" message="Sensitive actions will be recorded here." />}
        </div>
      ) : null}
    </div>
  );
}
