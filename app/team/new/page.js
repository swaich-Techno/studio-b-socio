"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import FormInput from "@/components/FormInput";
import Loading from "@/components/Loading";
import { permissionKeys, roleDefaultPermissions, skillOptions, teamRoles } from "@/lib/options";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  role: "",
  skills: "",
  salaryType: "Monthly",
  salaryAmount: "",
  assignedClients: [],
  status: "pending",
  notes: "",
  permissions: {}
};

export default function NewTeamPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [clients, setClients] = useState([]);
  const [memberId, setMemberId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/clients").then((res) => res.json()).then((data) => setClients(data.clients || []));
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    setMemberId(id);
    setLoading(true);
    fetch(`/api/team/${id}`).then((res) => res.json()).then((data) => {
      if (data.member) {
        setForm({
          ...emptyForm,
          ...data.member,
          assignedClients: (data.member.assignedClients || []).map((client) => client._id || client),
          permissions: { ...(data.member.permissions || {}) }
        });
      }
      setLoading(false);
    });
  }, []);

  function updateField(event) {
    const { name, value, checked, type } = event.target;
    if (permissionKeys.includes(name)) {
      setForm((current) => ({ ...current, permissions: { ...current.permissions, [name]: checked } }));
      return;
    }
    if (name === "assignedClients") {
      const values = Array.from(event.target.selectedOptions).map((option) => option.value);
      setForm((current) => ({ ...current, assignedClients: values }));
      return;
    }
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await fetch(memberId ? `/api/team/${memberId}` : "/api/team", {
      method: memberId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    router.push("/team");
    router.refresh();
  }

  if (loading) return <Loading label="Loading team member..." />;

  return (
    <div className="page-container">
      <h1 className="text-3xl font-black text-slate-950">{memberId ? "Edit Team Member" : "Add Team Member"}</h1>
      <form onSubmit={handleSubmit} className="mt-8 grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-2">
        <FormInput label="Name" name="name" value={form.name} onChange={updateField} required />
        <FormInput label="Email" name="email" type="email" value={form.email} onChange={updateField} />
        <FormInput label="Phone" name="phone" value={form.phone} onChange={updateField} />
        <FormInput label="Role" name="role" value={form.role} onChange={updateField} options={teamRoles} required />
        <FormInput className="md:col-span-2" label="Skills" name="skills" value={Array.isArray(form.skills) ? form.skills.join(", ") : form.skills} onChange={updateField} placeholder={skillOptions.slice(0, 5).join(", ")} />
        <FormInput label="Salary Type" name="salaryType" value={form.salaryType} onChange={updateField} options={["Monthly", "Per Project", "Hourly", "Commission", "Internship"]} />
        <FormInput label="Salary Amount" name="salaryAmount" type="number" value={form.salaryAmount} onChange={updateField} />
        <FormInput label="Status" name="status" value={form.status} onChange={updateField} options={["pending", "approved", "rejected", "suspended"]} />
        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          Assigned Clients
          <select name="assignedClients" multiple value={form.assignedClients} onChange={updateField} className="mt-1 min-h-32 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft">
            {clients.map((client) => <option key={client._id} value={client._id}>{client.businessName}</option>)}
          </select>
        </label>
        <div className="md:col-span-2">
          <h2 className="text-sm font-bold text-slate-950">Permissions</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            {permissionKeys.map((key) => (
              <label key={key} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <input type="checkbox" name={key} checked={Boolean(form.permissions?.[key] ?? roleDefaultPermissions[form.role]?.includes(key))} onChange={updateField} />
                {key.replaceAll("_", " ")}
              </label>
            ))}
          </div>
        </div>
        <FormInput className="md:col-span-2" label="Notes" name="notes" value={form.notes} onChange={updateField} textarea />
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit">Save Team Member</Button>
          <Button href="/team" variant="secondary">Cancel</Button>
        </div>
      </form>
    </div>
  );
}
