"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Button from "@/components/Button";
import DashboardCard from "@/components/DashboardCard";
import EmptyState from "@/components/EmptyState";
import FormInput from "@/components/FormInput";
import Loading from "@/components/Loading";

const platforms = ["Instagram", "Facebook", "YouTube Shorts", "WhatsApp Status"];
const numericFields = ["followers", "reach", "impressions", "likes", "comments", "shares", "saves", "profileVisits", "websiteClicks", "whatsappClicks", "leads", "salesEstimate"];
const emptyForm = {
  clientId: "",
  platform: "Instagram",
  date: "",
  followers: "",
  reach: "",
  impressions: "",
  likes: "",
  comments: "",
  shares: "",
  saves: "",
  profileVisits: "",
  websiteClicks: "",
  whatsappClicks: "",
  leads: "",
  salesEstimate: "",
  notes: ""
};

function total(entries, key) {
  return entries.reduce((sum, entry) => sum + Number(entry[key] || 0), 0);
}

const fieldLabels = {
  followers: "Followers",
  reach: "Reach",
  impressions: "Views / Impressions",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  saves: "Saves",
  profileVisits: "Profile Visits",
  websiteClicks: "Website Clicks",
  whatsappClicks: "WhatsApp Clicks",
  leads: "Leads",
  salesEstimate: "Sales Estimate"
};

export default function AnalyticsPage() {
  const [clients, setClients] = useState(null);
  const [entries, setEntries] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState("");

  async function loadData() {
    const [clientRes, analyticsRes] = await Promise.all([fetch("/api/clients"), fetch("/api/analytics")]);
    const [clientData, analyticsData] = await Promise.all([clientRes.json(), analyticsRes.json()]);
    const queryClient = new URLSearchParams(window.location.search).get("clientId");
    setClients(clientData.clients || []);
    setEntries(analyticsData.analytics || []);
    if (queryClient) setForm((current) => ({ ...current, clientId: queryClient }));
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const body = { ...form };
    numericFields.forEach((field) => {
      body[field] = Number(body[field] || 0);
    });
    await fetch(editing ? `/api/analytics/${editing}` : "/api/analytics", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setForm(emptyForm);
    setEditing("");
    loadData();
  }

  function editEntry(entry) {
    setEditing(entry._id);
    setForm({ ...emptyForm, ...entry, clientId: entry.clientId?._id || entry.clientId, date: entry.date?.slice(0, 10) });
  }

  async function deleteEntry(id) {
    await fetch(`/api/analytics/${id}`, { method: "DELETE" });
    loadData();
  }

  const chartData = useMemo(() => (entries || []).slice().reverse().map((entry) => ({
    date: new Date(entry.date).toLocaleDateString(),
    followers: Number(entry.followers || 0),
    reach: Number(entry.reach || 0),
    engagement: Number(entry.likes || 0) + Number(entry.comments || 0) + Number(entry.shares || 0) + Number(entry.saves || 0),
    leads: Number(entry.leads || 0)
  })), [entries]);

  const comparison = useMemo(() => {
    const now = new Date();
    const thisMonth = (entries || []).filter((entry) => new Date(entry.date).getMonth() === now.getMonth() && new Date(entry.date).getFullYear() === now.getFullYear());
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = (entries || []).filter((entry) => new Date(entry.date).getMonth() === previousMonthDate.getMonth() && new Date(entry.date).getFullYear() === previousMonthDate.getFullYear());
    return {
      currentReach: total(thisMonth, "reach"),
      previousReach: total(previousMonth, "reach"),
      currentLeads: total(thisMonth, "leads"),
      previousLeads: total(previousMonth, "leads")
    };
  }, [entries]);

  if (!clients || !entries) return <Loading label="Loading analytics..." />;

  return (
    <div className="page-container">
      <h1 className="text-3xl font-black text-slate-950">Analytics</h1>
      <p className="mt-2 text-slate-500">Manual social media analytics tracker with charts and month comparison. Future Meta/Instagram API sync can use the same model fields.</p>

      <div className="mt-8 grid gap-5 md:grid-cols-4">
        <DashboardCard label="Followers" value={total(entries, "followers")} />
        <DashboardCard label="Reach" value={total(entries, "reach")} helper={`${comparison.currentReach - comparison.previousReach >= 0 ? "+" : ""}${comparison.currentReach - comparison.previousReach} vs previous month`} />
        <DashboardCard label="Engagement" value={total(entries, "likes") + total(entries, "comments") + total(entries, "shares") + total(entries, "saves")} />
        <DashboardCard label="Leads" value={total(entries, "leads")} helper={`${comparison.currentLeads - comparison.previousLeads >= 0 ? "+" : ""}${comparison.currentLeads - comparison.previousLeads} vs previous month`} />
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-4">
        <label className="block text-sm font-medium text-slate-700">
          Client
          <select name="clientId" value={form.clientId} onChange={updateField} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" required>
            <option value="">Select Client</option>
            {clients.map((client) => <option key={client._id} value={client._id}>{client.businessName}</option>)}
          </select>
        </label>
        <FormInput label="Platform" name="platform" value={form.platform} onChange={updateField} options={platforms} required />
        <FormInput label="Date" name="date" type="date" value={form.date} onChange={updateField} required />
        {numericFields.map((field) => (
          <FormInput key={field} label={fieldLabels[field]} name={field} type="number" value={form[field]} onChange={updateField} />
        ))}
        <FormInput className="md:col-span-4" label="Notes" name="notes" value={form.notes} onChange={updateField} textarea />
        <div className="flex gap-2 md:col-span-4">
          <Button type="submit">{editing ? "Update Analytics" : "Add Analytics"}</Button>
          {editing ? <Button variant="secondary" onClick={() => { setEditing(""); setForm(emptyForm); }}>Cancel Edit</Button> : null}
        </div>
      </form>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg font-bold text-slate-950">Followers, Reach, Engagement</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="followers" stroke="#0f766e" />
                <Line type="monotone" dataKey="reach" stroke="#111827" />
                <Line type="monotone" dataKey="engagement" stroke="#64748b" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-bold text-slate-950">Leads</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="leads" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="mt-8 card p-5">
        <h2 className="text-xl font-bold text-slate-950">Analytics Table</h2>
        <div className="mt-4 overflow-x-auto">
          {entries.length ? (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="p-3">Client</th><th className="p-3">Platform</th><th className="p-3">Date</th><th className="p-3">Reach</th><th className="p-3">Followers</th><th className="p-3">Leads</th><th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry._id} className="border-t border-slate-100">
                    <td className="p-3 font-semibold">{entry.clientId?.businessName}</td>
                    <td className="p-3">{entry.platform}</td>
                    <td className="p-3">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="p-3">{entry.reach}</td>
                    <td className="p-3">{entry.followers}</td>
                    <td className="p-3">{entry.leads}</td>
                    <td className="flex gap-2 p-3"><Button variant="secondary" onClick={() => editEntry(entry)}>Edit</Button><Button variant="danger" onClick={() => deleteEntry(entry._id)}>Delete</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState title="No analytics yet" message="Add manual entries to see charts and monthly comparisons." />}
        </div>
      </section>
    </div>
  );
}
