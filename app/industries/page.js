"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import Loading from "@/components/Loading";

export default function IndustriesPage() {
  const [industries, setIndustries] = useState(null);

  async function loadIndustries() {
    const response = await fetch("/api/industries");
    const data = await response.json();
    setIndustries(data.industries || []);
  }

  useEffect(() => {
    loadIndustries();
  }, []);

  async function deleteIndustry(id) {
    if (!confirm("Delete this custom industry?")) return;
    await fetch(`/api/industries/${id}`, { method: "DELETE" });
    loadIndustries();
  }

  if (!industries) return <Loading label="Loading industries..." />;

  return (
    <div className="page-container">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Industries</h1>
          <p className="mt-2 text-slate-500">Default and custom marketing playbooks for local business niches.</p>
        </div>
        <Button href="/industries/new">Add Custom Industry</Button>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {industries.length ? industries.map((industry) => (
          <article key={industry._id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{industry.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{industry.category}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{industry.isDefault ? "Default" : "Custom"}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{industry.description || "No description added."}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button href={`/industries/${industry._id}`} variant="secondary">View</Button>
              {!industry.isDefault ? <Button href={`/industries/new?id=${industry._id}`}>Edit</Button> : null}
              {!industry.isDefault ? <Button variant="danger" onClick={() => deleteIndustry(industry._id)}>Delete</Button> : null}
            </div>
          </article>
        )) : <EmptyState title="No industries found" message="Add a custom industry playbook for your agency." actionHref="/industries/new" actionLabel="Add Industry" />}
      </div>
    </div>
  );
}
