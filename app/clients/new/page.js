"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import FormInput from "@/components/FormInput";
import Loading from "@/components/Loading";

const initialClient = {
  businessName: "",
  industry: "",
  businessType: "",
  location: "",
  contactPerson: "",
  phone: "",
  email: "",
  instagramHandle: "",
  facebookPage: "",
  whatsappNumber: "",
  brandColors: "",
  targetAudience: "",
  mainProducts: "",
  packageName: "",
  monthlyFee: "",
  advancePaid: "",
  balancePending: "",
  postsPerMonth: "",
  reelsPerMonth: "",
  storiesPerMonth: "",
  startDate: "",
  renewalDate: "",
  contractUrl: "",
  visibleToAllTeam: false,
  assignedTeamMembers: [],
  assignedDesigner: "",
  assignedReelEditor: "",
  assignedPhotographer: "",
  assignedAdsManager: "",
  assignedCoordinator: "",
  brandBrain: {
    brandTone: "",
    doNotUseWords: "",
    preferredLanguage: "",
    brandColors: "",
    mainAudience: "",
    bestSellingProducts: "",
    competitors: "",
    commonQuestions: "",
    previousSuccessfulContent: "",
    designPreferences: "",
    notes: ""
  },
  notes: "",
  status: "Active"
};

export default function AddClientPage() {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [industries, setIndustries] = useState([]);
  const [team, setTeam] = useState([]);
  const [form, setForm] = useState(initialClient);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/industries").then((res) => res.json()).then((data) => {
      const names = (data.industries || []).map((industry) => industry.name);
      setIndustries([...new Set([...names, "Other"])]);
    });
    fetch("/api/team").then((res) => res.json()).then((data) => setTeam((data.team || []).filter((member) => member.status === "approved")));
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    setClientId(id);
    setLoading(true);
    fetch(`/api/clients/${id}`).then((res) => res.json()).then((data) => {
      if (data.client) setForm({
        ...initialClient,
        ...data.client,
        startDate: data.client.startDate?.slice(0, 10) || "",
        renewalDate: data.client.renewalDate?.slice(0, 10) || "",
        assignedTeamMembers: (data.client.assignedTeamMembers || []).map((member) => member._id || member),
        assignedDesigner: data.client.assignedDesigner?._id || data.client.assignedDesigner || "",
        assignedReelEditor: data.client.assignedReelEditor?._id || data.client.assignedReelEditor || "",
        assignedPhotographer: data.client.assignedPhotographer?._id || data.client.assignedPhotographer || "",
        assignedAdsManager: data.client.assignedAdsManager?._id || data.client.assignedAdsManager || "",
        assignedCoordinator: data.client.assignedCoordinator?._id || data.client.assignedCoordinator || "",
        brandBrain: { ...initialClient.brandBrain, ...(data.client.brandBrain || {}) }
      });
      setLoading(false);
    });
  }, []);

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    if (name.startsWith("brandBrain.")) {
      const key = name.replace("brandBrain.", "");
      setForm((current) => ({ ...current, brandBrain: { ...current.brandBrain, [key]: value } }));
      return;
    }
    if (name === "assignedTeamMembers") {
      const values = Array.from(event.target.selectedOptions).map((option) => option.value);
      setForm((current) => ({ ...current, assignedTeamMembers: values }));
      return;
    }
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch(clientId ? `/api/clients/${clientId}` : "/api/clients", {
      method: clientId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error || "Could not save client.");
      return;
    }
    router.push(clientId ? `/clients/${clientId}` : "/clients");
    router.refresh();
  }

  if (loading) return <Loading label="Loading client..." />;

  return (
    <div className="page-container">
      <div>
        <h1 className="text-3xl font-black text-slate-950">{clientId ? "Edit Client" : "Add Client"}</h1>
        <p className="mt-2 text-slate-500">Save all useful brand, contact, and content planning details.</p>
      </div>
      <form onSubmit={handleSubmit} className="mt-8 grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-2">
        <FormInput label="Business Name" name="businessName" value={form.businessName} onChange={updateField} required />
        <FormInput label="Industry" name="industry" value={form.industry} onChange={updateField} options={industries} required />
        <FormInput label="Business Type" name="businessType" value={form.businessType} onChange={updateField} />
        <FormInput label="Location" name="location" value={form.location} onChange={updateField} />
        <FormInput label="Contact Person" name="contactPerson" value={form.contactPerson} onChange={updateField} />
        <FormInput label="Phone Number" name="phone" value={form.phone} onChange={updateField} />
        <FormInput label="Email" name="email" type="email" value={form.email} onChange={updateField} />
        <FormInput label="Instagram Handle" name="instagramHandle" value={form.instagramHandle} onChange={updateField} />
        <FormInput label="Facebook Page" name="facebookPage" value={form.facebookPage} onChange={updateField} />
        <FormInput label="WhatsApp Number" name="whatsappNumber" value={form.whatsappNumber} onChange={updateField} />
        <FormInput label="Brand Colors" name="brandColors" value={form.brandColors} onChange={updateField} placeholder="Black, white, teal" />
        <FormInput label="Status" name="status" value={form.status} onChange={updateField} options={["Lead", "Onboarding", "Active", "Paused", "Lost"]} />
        <FormInput label="Package" name="packageName" value={form.packageName} onChange={updateField} />
        <FormInput label="Monthly Fee" name="monthlyFee" type="number" value={form.monthlyFee} onChange={updateField} />
        <FormInput label="Advance Paid" name="advancePaid" type="number" value={form.advancePaid} onChange={updateField} />
        <FormInput label="Balance Pending" name="balancePending" type="number" value={form.balancePending} onChange={updateField} />
        <FormInput label="Posts Per Month" name="postsPerMonth" type="number" value={form.postsPerMonth} onChange={updateField} />
        <FormInput label="Reels Per Month" name="reelsPerMonth" type="number" value={form.reelsPerMonth} onChange={updateField} />
        <FormInput label="Stories Per Month" name="storiesPerMonth" type="number" value={form.storiesPerMonth} onChange={updateField} />
        <FormInput label="Start Date" name="startDate" type="date" value={form.startDate} onChange={updateField} />
        <FormInput label="Renewal Date" name="renewalDate" type="date" value={form.renewalDate} onChange={updateField} />
        <FormInput label="Contract URL" name="contractUrl" value={form.contractUrl} onChange={updateField} />
        <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-700 md:col-span-2">
          <input type="checkbox" name="visibleToAllTeam" checked={form.visibleToAllTeam} onChange={updateField} />
          Visible to all approved team members
        </label>
        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          Assigned Team Members
          <select name="assignedTeamMembers" multiple value={form.assignedTeamMembers} onChange={updateField} className="mt-1 min-h-32 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft">
            {team.map((member) => <option key={member._id} value={member._id}>{member.name} · {member.role}</option>)}
          </select>
        </label>
        {[
          ["Assigned designer", "assignedDesigner"],
          ["Assigned reel editor", "assignedReelEditor"],
          ["Assigned photographer", "assignedPhotographer"],
          ["Assigned ads manager", "assignedAdsManager"],
          ["Assigned coordinator", "assignedCoordinator"]
        ].map(([label, name]) => (
          <label key={name} className="block text-sm font-medium text-slate-700">
            {label}
            <select name={name} value={form[name]} onChange={updateField} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft">
              <option value="">Not assigned</option>
              {team.map((member) => <option key={member._id} value={member._id}>{member.name} · {member.role}</option>)}
            </select>
          </label>
        ))}
        <FormInput className="md:col-span-2" label="Target Audience" name="targetAudience" value={form.targetAudience} onChange={updateField} textarea />
        <FormInput className="md:col-span-2" label="Services/Products" name="mainProducts" value={form.mainProducts} onChange={updateField} textarea />
        <FormInput className="md:col-span-2" label="Special Notes" name="notes" value={form.notes} onChange={updateField} textarea />
        <div className="md:col-span-2">
          <h2 className="mt-2 text-xl font-bold text-slate-950">Brand Brain</h2>
          <p className="mt-1 text-sm text-slate-500">These details guide captions, images, reels, and reports.</p>
        </div>
        <FormInput label="Brand tone" name="brandBrain.brandTone" value={form.brandBrain.brandTone} onChange={updateField} />
        <FormInput label="Preferred language" name="brandBrain.preferredLanguage" value={form.brandBrain.preferredLanguage} onChange={updateField} options={["English", "Hindi", "Punjabi", "Hinglish"]} />
        <FormInput label="Brand colors" name="brandBrain.brandColors" value={form.brandBrain.brandColors} onChange={updateField} />
        <FormInput label="Main audience" name="brandBrain.mainAudience" value={form.brandBrain.mainAudience} onChange={updateField} />
        <FormInput className="md:col-span-2" label="Do not use words" name="brandBrain.doNotUseWords" value={form.brandBrain.doNotUseWords} onChange={updateField} textarea />
        <FormInput className="md:col-span-2" label="Best-selling products" name="brandBrain.bestSellingProducts" value={form.brandBrain.bestSellingProducts} onChange={updateField} textarea />
        <FormInput className="md:col-span-2" label="Competitors" name="brandBrain.competitors" value={form.brandBrain.competitors} onChange={updateField} textarea />
        <FormInput className="md:col-span-2" label="Common customer questions" name="brandBrain.commonQuestions" value={form.brandBrain.commonQuestions} onChange={updateField} textarea />
        <FormInput className="md:col-span-2" label="Previous successful content" name="brandBrain.previousSuccessfulContent" value={form.brandBrain.previousSuccessfulContent} onChange={updateField} textarea />
        <FormInput className="md:col-span-2" label="Design preferences" name="brandBrain.designPreferences" value={form.brandBrain.designPreferences} onChange={updateField} textarea />
        <FormInput className="md:col-span-2" label="Brand Brain notes" name="brandBrain.notes" value={form.brandBrain.notes} onChange={updateField} textarea />
        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 md:col-span-2">{error}</p> : null}
        <div className="flex gap-3 md:col-span-2">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Client"}</Button>
          <Button href="/clients" variant="secondary">Cancel</Button>
        </div>
      </form>
    </div>
  );
}
