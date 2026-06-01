"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import FormInput from "@/components/FormInput";
import Loading from "@/components/Loading";

const emptyForm = {
  name: "",
  monthlyPrice: "",
  postsPerMonth: "",
  reelsPerMonth: "",
  storiesPerMonth: "",
  adManagementIncluded: false,
  reportIncluded: true,
  notes: ""
};

export default function PackagesPage() {
  const [packages, setPackages] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState("");

  async function loadPackages() {
    const response = await fetch("/api/packages");
    const data = await response.json();
    setPackages(data.packages || []);
  }

  useEffect(() => {
    loadPackages();
  }, []);

  function updateField(event) {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await fetch(editing ? `/api/packages/${editing}` : "/api/packages", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm(emptyForm);
    setEditing("");
    loadPackages();
  }

  function editPackage(packageItem) {
    setEditing(packageItem._id);
    setForm({ ...emptyForm, ...packageItem });
  }

  async function deletePackage(id) {
    await fetch(`/api/packages/${id}`, { method: "DELETE" });
    loadPackages();
  }

  if (!packages) return <Loading label="Loading packages..." />;

  return (
    <div className="page-container">
      <h1 className="text-3xl font-black text-slate-950">Packages</h1>
      <p className="mt-2 text-slate-500">Create agency service packages for monthly billing.</p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-4">
        <FormInput label="Package Name" name="name" value={form.name} onChange={updateField} required />
        <FormInput label="Monthly Price" name="monthlyPrice" type="number" value={form.monthlyPrice} onChange={updateField} />
        <FormInput label="Posts/Month" name="postsPerMonth" type="number" value={form.postsPerMonth} onChange={updateField} />
        <FormInput label="Reels/Month" name="reelsPerMonth" type="number" value={form.reelsPerMonth} onChange={updateField} />
        <FormInput label="Stories/Month" name="storiesPerMonth" type="number" value={form.storiesPerMonth} onChange={updateField} />
        <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><input type="checkbox" name="adManagementIncluded" checked={form.adManagementIncluded} onChange={updateField} /> Ads included</label>
        <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><input type="checkbox" name="reportIncluded" checked={form.reportIncluded} onChange={updateField} /> Report included</label>
        <FormInput className="md:col-span-4" label="Notes" name="notes" value={form.notes} onChange={updateField} textarea />
        <div className="flex gap-2 md:col-span-4">
          <Button type="submit">{editing ? "Update Package" : "Add Package"}</Button>
          {editing ? <Button variant="secondary" onClick={() => { setEditing(""); setForm(emptyForm); }}>Cancel Edit</Button> : null}
        </div>
      </form>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {packages.length ? packages.map((packageItem) => (
          <article key={packageItem._id} className="card p-5">
            <h2 className="text-lg font-bold text-slate-950">{packageItem.name}</h2>
            <p className="mt-2 text-3xl font-black text-slate-950">₹{packageItem.monthlyPrice || 0}</p>
            <p className="mt-3 text-sm text-slate-600">{packageItem.postsPerMonth} posts · {packageItem.reelsPerMonth} reels · {packageItem.storiesPerMonth} stories</p>
            <p className="mt-2 text-sm text-slate-600">Ads: {packageItem.adManagementIncluded ? "Included" : "Not included"} · Report: {packageItem.reportIncluded ? "Included" : "No"}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => editPackage(packageItem)}>Edit</Button>
              <Button variant="danger" onClick={() => deletePackage(packageItem._id)}>Delete</Button>
            </div>
          </article>
        )) : <div className="md:col-span-3"><EmptyState title="No packages yet" message="Add your first monthly package." /></div>}
      </div>
    </div>
  );
}
