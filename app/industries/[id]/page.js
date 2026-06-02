"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/Button";
import Loading from "@/components/Loading";

export default function IndustryDetailPage() {
  const { id } = useParams();
  const [industry, setIndustry] = useState(null);

  useEffect(() => {
    fetch(`/api/industries/${id}`).then((res) => res.json()).then((data) => setIndustry(data.industry));
  }, [id]);

  if (!industry) return <Loading label="Loading industry..." />;

  return (
    <div className="page-container">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-black text-slate-950">{industry.name}</h1>
          <p className="mt-2 text-slate-500">{industry.category} {industry.isDefault ? "default playbook" : "custom playbook"}</p>
        </div>
        {!industry.isDefault ? <Button href={`/industries/new?id=${industry._id}`}>Edit Industry</Button> : null}
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-lg font-bold text-slate-950">Description</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{industry.description || "No description added."}</p>
        </section>
        {[
          ["Content Ideas", industry.defaultContentIdeas],
          ["Hashtags", industry.defaultHashtags],
          ["Poster Styles", industry.defaultPosterStyles],
          ["Reel Ideas", industry.defaultReelIdeas]
        ].map(([title, items]) => (
          <section key={title} className="card p-5">
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>
            <ul className="mt-3 grid gap-2 text-sm text-slate-600">
              {(items || []).map((item) => <li key={item} className="rounded-xl bg-slate-50 p-3">{item}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
