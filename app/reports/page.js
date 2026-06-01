"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import FormInput from "@/components/FormInput";
import Loading from "@/components/Loading";

const months = Array.from({ length: 12 }, (_, index) => String(index + 1));

export default function ReportsPage() {
  const [clients, setClients] = useState(null);
  const [reports, setReports] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadData() {
    const [clientRes, reportRes] = await Promise.all([fetch("/api/clients"), fetch("/api/reports")]);
    const [clientData, reportData] = await Promise.all([clientRes.json(), reportRes.json()]);
    setClients(clientData.clients || []);
    setReports(reportData.reports || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, month: Number(body.month), year: Number(body.year) })
    });
    const data = await response.json();
    setLoading(false);
    if (data.report) {
      setSelectedReport(data.report);
      loadData();
    }
  }

  if (!clients || !reports) return <Loading label="Loading reports..." />;

  const active = selectedReport || reports[0];
  const reportText = active ? `${active.clientId?.businessName || "Client"} ${active.month}/${active.year}\n\n${active.summary}\n\n${active.analyticsSummary}\n\n${active.completedWork}\n\n${active.nextMonthSuggestions}` : "";

  return (
    <div className="page-container">
      <div className="no-print">
        <h1 className="text-3xl font-black text-slate-950">Client Reports</h1>
        <p className="mt-2 text-slate-500">Generate monthly summaries from calendar plans, completed tasks, and manual analytics.</p>
        <form onSubmit={handleSubmit} className="mt-8 grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-4">
          <label className="block text-sm font-medium text-slate-700">
            Client
            <select name="clientId" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" required>
              <option value="">Select Client</option>
              {clients.map((client) => <option key={client._id} value={client._id}>{client.businessName}</option>)}
            </select>
          </label>
          <FormInput label="Month" name="month" options={months} defaultValue={String(new Date().getMonth() + 1)} required />
          <FormInput label="Year" name="year" type="number" defaultValue={new Date().getFullYear()} required />
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={loading}>{loading ? "Generating..." : "Generate Report"}</Button>
            <Button variant="secondary" onClick={() => window.print()}>Download PDF</Button>
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(reportText)}>Copy</Button>
          </div>
        </form>
      </div>

      {active ? (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-soft">
          <div className="border-b border-slate-100 pb-6">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">B Socio Studio Report</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">{active.clientId?.businessName || "Client"} · {active.month}/{active.year}</h2>
            <p className="mt-2 text-slate-500">Platforms handled: {active.platformsHandled?.length ? active.platformsHandled.join(", ") : "Add calendar items to calculate platforms"}</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Posts</p><p className="text-2xl font-black">{active.totals?.posts || 0}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Reels</p><p className="text-2xl font-black">{active.totals?.reels || 0}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Stories</p><p className="text-2xl font-black">{active.totals?.stories || 0}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Leads</p><p className="text-2xl font-black">{active.totals?.leads || 0}</p></div>
          </div>
          {[
            ["Growth Summary", active.summary],
            ["Analytics Summary", active.analyticsSummary],
            ["Best Performing Content", active.bestContent],
            ["Work Completed", active.completedWork],
            ["Suggestions for Next Month", active.nextMonthSuggestions],
            ["Pending Improvements", "Review unfinished tasks, collect more content performance notes, and confirm approvals earlier in the month."]
          ].map(([title, text]) => (
            <div key={title} className="mt-6">
              <h3 className="text-lg font-bold text-slate-950">{title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{text}</p>
            </div>
          ))}
        </section>
      ) : (
        <div className="mt-8"><EmptyState title="No reports yet" message="Select a client, month, and year to generate the first professional report." /></div>
      )}

      <section className="no-print mt-8 card p-5">
        <h2 className="text-xl font-bold text-slate-950">Saved Reports</h2>
        <div className="mt-4 grid gap-3">
          {reports.map((report) => (
            <button key={report._id} onClick={() => setSelectedReport(report)} className="rounded-xl bg-slate-50 p-4 text-left text-sm hover:bg-slate-100">
              <span className="font-bold text-slate-950">{report.clientId?.businessName}</span>
              <span className="ml-2 text-slate-500">{report.month}/{report.year}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
