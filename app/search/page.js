"use client";

import { useState } from "react";
import EmptyState from "@/components/EmptyState";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  async function runSearch(event) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    setResults(data.results || []);
    setLoading(false);
  }

  return (
    <div className="page-container">
      <h1 className="text-3xl font-black text-slate-950">Global Search</h1>
      <p className="mt-2 text-slate-500">Find clients, tasks, reports, captions, hashtags, and content ideas.</p>
      <form onSubmit={runSearch} className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft md:flex-row">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients, tasks, reports, captions..." className="min-h-12 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" />
        <button className="rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent-dark" type="submit">{loading ? "Searching..." : "Search"}</button>
      </form>

      <div className="mt-8 grid gap-3">
        {results.length ? results.map((item, index) => (
          <a key={`${item.type}-${index}`} href={item.href} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-accent-soft">
            <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
              <div>
                <p className="font-black text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{item.type}</span>
            </div>
          </a>
        )) : <EmptyState title="Search your agency workspace" message="Type a client name, task title, report text, caption, or hashtag to begin." />}
      </div>
    </div>
  );
}
