"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import FormInput from "@/components/FormInput";
import Loading from "@/components/Loading";

const industries = ["Sweet Shop", "Restaurant", "Cafe", "Salon", "Boutique", "Gym", "Clinic", "Coaching Center", "Real Estate", "Automobile", "Grocery Store", "Other"];
const platforms = ["Instagram", "Facebook", "YouTube Shorts", "WhatsApp Status"];
const trendTypes = ["Reel Audio", "Meme", "Festival", "Offer", "Local Event", "Seasonal Product"];
const statuses = ["New", "Testing", "Used", "Archived"];

export default function TrendsPage() {
  const [trends, setTrends] = useState(null);
  const [filters, setFilters] = useState({ industry: "", platform: "" });
  const [editing, setEditing] = useState(null);

  const loadTrends = useCallback(async function loadTrends() {
    const params = new URLSearchParams();
    if (filters.industry) params.set("industry", filters.industry);
    if (filters.platform) params.set("platform", filters.platform);
    const response = await fetch(`/api/trends?${params}`);
    const data = await response.json();
    setTrends(data.trends || []);
  }, [filters.industry, filters.platform]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  async function handleSubmit(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    await fetch(editing ? `/api/trends/${editing._id}` : "/api/trends", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    event.currentTarget.reset();
    setEditing(null);
    loadTrends();
  }

  async function removeTrend(id) {
    await fetch(`/api/trends/${id}`, { method: "DELETE" });
    loadTrends();
  }

  if (!trends) return <Loading label="Loading trends..." />;

  return (
    <div className="page-container">
      <h1 className="text-3xl font-black text-slate-950">Trend Board</h1>
      <p className="mt-2 text-slate-500">Manual trend tracking for now. API integrations can be added later for Instagram, TikTok, YouTube, and Meta trend data.</p>

      <div className="mt-6 grid gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-soft md:grid-cols-2">
        <FormInput label="Filter by Industry" value={filters.industry} onChange={(e) => setFilters({ ...filters, industry: e.target.value })} options={industries} />
        <FormInput label="Filter by Platform" value={filters.platform} onChange={(e) => setFilters({ ...filters, platform: e.target.value })} options={platforms} />
      </div>

      <form onSubmit={handleSubmit} key={editing?._id || "new"} className="mt-6 grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-2">
        <FormInput label="Industry" name="industry" defaultValue={editing?.industry || ""} options={industries} required />
        <FormInput label="Platform" name="platform" defaultValue={editing?.platform || ""} options={platforms} required />
        <FormInput label="Trend Title" name="title" defaultValue={editing?.title || ""} required />
        <FormInput label="Trend Type" name="trendType" defaultValue={editing?.trendType || ""} options={trendTypes} required />
        <FormInput label="Status" name="status" defaultValue={editing?.status || "New"} options={statuses} />
        <FormInput className="md:col-span-2" label="Description" name="description" defaultValue={editing?.description || ""} textarea />
        <FormInput className="md:col-span-2" label="How to use this trend" name="usageIdea" defaultValue={editing?.usageIdea || ""} textarea />
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit">{editing ? "Update Trend" : "Add Trend"}</Button>
          {editing ? <Button variant="secondary" onClick={() => setEditing(null)}>Cancel Edit</Button> : null}
        </div>
      </form>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {trends.length ? trends.map((trend) => (
          <article key={trend._id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-950">{trend.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{trend.industry} · {trend.platform}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{trend.status}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{trend.description || "No description yet."}</p>
            <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{trend.usageIdea || "Add a usage idea for your team."}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(trend)}>Edit</Button>
              <Button variant="danger" onClick={() => removeTrend(trend._id)}>Delete</Button>
            </div>
          </article>
        )) : <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No trends added" message="Add reel audios, memes, festivals, offers, local events, and seasonal ideas." /></div>}
      </div>
    </div>
  );
}
