"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import FormInput from "@/components/FormInput";
import Loading from "@/components/Loading";

const emptyForm = {
  name: "",
  category: "Custom",
  description: "",
  defaultContentIdeas: "",
  defaultHashtags: "",
  defaultPosterStyles: "",
  defaultReelIdeas: ""
};

export default function NewIndustryPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [industryId, setIndustryId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    setIndustryId(id);
    setLoading(true);
    fetch(`/api/industries/${id}`).then((res) => res.json()).then((data) => {
      if (data.industry) {
        setForm({
          name: data.industry.name || "",
          category: data.industry.category || "Custom",
          description: data.industry.description || "",
          defaultContentIdeas: (data.industry.defaultContentIdeas || []).join("\n"),
          defaultHashtags: (data.industry.defaultHashtags || []).join(", "),
          defaultPosterStyles: (data.industry.defaultPosterStyles || []).join(", "),
          defaultReelIdeas: (data.industry.defaultReelIdeas || []).join("\n")
        });
      }
      setLoading(false);
    });
  }, []);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await fetch(industryId ? `/api/industries/${industryId}` : "/api/industries", {
      method: industryId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    router.push("/industries");
    router.refresh();
  }

  if (loading) return <Loading label="Loading industry..." />;

  return (
    <div className="page-container">
      <h1 className="text-3xl font-black text-slate-950">{industryId ? "Edit Industry" : "Add Custom Industry"}</h1>
      <form onSubmit={handleSubmit} className="mt-8 grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-2">
        <FormInput label="Industry Name" name="name" value={form.name} onChange={updateField} required />
        <FormInput label="Category" name="category" value={form.category} onChange={updateField} />
        <FormInput className="md:col-span-2" label="Description" name="description" value={form.description} onChange={updateField} textarea />
        <FormInput className="md:col-span-2" label="Default Content Ideas" name="defaultContentIdeas" value={form.defaultContentIdeas} onChange={updateField} textarea />
        <FormInput className="md:col-span-2" label="Default Hashtags" name="defaultHashtags" value={form.defaultHashtags} onChange={updateField} textarea />
        <FormInput className="md:col-span-2" label="Default Poster Styles" name="defaultPosterStyles" value={form.defaultPosterStyles} onChange={updateField} />
        <FormInput className="md:col-span-2" label="Default Reel Ideas" name="defaultReelIdeas" value={form.defaultReelIdeas} onChange={updateField} textarea />
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit">Save Industry</Button>
          <Button href="/industries" variant="secondary">Cancel</Button>
        </div>
      </form>
    </div>
  );
}
