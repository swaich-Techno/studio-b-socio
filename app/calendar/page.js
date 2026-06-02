"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import FormInput from "@/components/FormInput";
import Loading from "@/components/Loading";

const platforms = ["Instagram", "Facebook", "YouTube Shorts", "WhatsApp Status"];
const contentTypes = ["Post", "Reel", "Story", "Carousel", "Offer Poster"];
const statuses = ["Idea", "In Progress", "Need Owner Approval", "Sent to Client", "Client Revision", "Approved", "Scheduled", "Posted"];

const emptyForm = { clientId: "", dueDate: "", postDate: "", platform: "", contentType: "", topic: "", caption: "", hashtags: "", status: "Idea", approvalStatus: "Idea", assignedTo: "", revisionNotes: "", notes: "" };

export default function CalendarPage() {
  const [clients, setClients] = useState(null);
  const [team, setTeam] = useState([]);
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState("");

  async function loadData() {
    const [clientRes, teamRes, calendarRes] = await Promise.all([fetch("/api/clients"), fetch("/api/team"), fetch("/api/calendar")]);
    const [clientData, teamData, calendarData] = await Promise.all([clientRes.json(), teamRes.json(), calendarRes.json()]);
    setClients(clientData.clients || []);
    setTeam(teamData.team || []);
    setItems(calendarData.calendar || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await fetch(editing ? `/api/calendar/${editing}` : "/api/calendar", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm(emptyForm);
    setEditing("");
    loadData();
  }

  function editItem(item) {
    setEditing(item._id);
    setForm({ ...emptyForm, ...item, clientId: item.clientId?._id || item.clientId, dueDate: item.dueDate?.slice(0, 10) || "", postDate: item.postDate?.slice(0, 10) || item.date?.slice(0, 10) || "" });
  }

  async function deleteItem(id) {
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    loadData();
  }

  const days = useMemo(() => {
    const now = new Date();
    const count = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({ length: count }, (_, index) => new Date(now.getFullYear(), now.getMonth(), index + 1));
  }, []);

  if (!clients || !items) return <Loading label="Loading calendar..." />;

  return (
    <div className="page-container">
      <h1 className="text-3xl font-black text-slate-950">Content Calendar</h1>
      <p className="mt-2 text-slate-500">Add, edit, approve, and track monthly content plans.</p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-3">
        <label className="block text-sm font-medium text-slate-700">
          Client
          <select name="clientId" value={form.clientId} onChange={updateField} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" required>
            <option value="">Select Client</option>
            {clients.map((client) => <option key={client._id} value={client._id}>{client.businessName}</option>)}
          </select>
        </label>
        <FormInput label="Due Date" name="dueDate" type="date" value={form.dueDate} onChange={updateField} />
        <FormInput label="Post Date" name="postDate" type="date" value={form.postDate} onChange={updateField} required />
        <FormInput label="Platform" name="platform" value={form.platform} onChange={updateField} options={platforms} required />
        <FormInput label="Content Type" name="contentType" value={form.contentType} onChange={updateField} options={contentTypes} required />
        <FormInput label="Topic" name="topic" value={form.topic} onChange={updateField} required />
        <FormInput label="Status" name="status" value={form.status} onChange={updateField} options={statuses} />
        <FormInput label="Approval Status" name="approvalStatus" value={form.approvalStatus} onChange={updateField} options={statuses} />
        <FormInput label="Assigned To" name="assignedTo" value={form.assignedTo} onChange={updateField} options={team.map((member) => member.name)} />
        <FormInput label="Caption" name="caption" value={form.caption} onChange={updateField} textarea />
        <FormInput label="Hashtags" name="hashtags" value={form.hashtags} onChange={updateField} textarea />
        <FormInput label="Revision Notes" name="revisionNotes" value={form.revisionNotes} onChange={updateField} textarea />
        <FormInput className="md:col-span-3" label="Notes" name="notes" value={form.notes} onChange={updateField} textarea />
        <div className="flex gap-2 md:col-span-3">
          <Button type="submit">{editing ? "Update Plan" : "Add Plan"}</Button>
          {editing ? <Button variant="secondary" onClick={() => { setEditing(""); setForm(emptyForm); }}>Cancel Edit</Button> : null}
        </div>
      </form>

      <section className="mt-8 grid gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft md:grid-cols-7">
        {days.map((day) => {
          const dayItems = items.filter((item) => new Date(item.postDate || item.date).toDateString() === day.toDateString());
          return (
            <div key={day.toISOString()} className="min-h-28 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm font-bold text-slate-900">{day.getDate()}</p>
              <div className="mt-2 grid gap-2">
                {dayItems.slice(0, 2).map((item) => (
                  <button key={item._id} onClick={() => editItem(item)} className="rounded-lg bg-white p-2 text-left text-xs font-semibold text-slate-700 shadow-sm">
                    {item.topic}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-8 card p-5">
        <h2 className="text-xl font-bold text-slate-950">Calendar List</h2>
        <div className="mt-4 grid gap-3">
          {items.length ? items.map((item) => (
            <div key={item._id} className="flex flex-col justify-between gap-3 rounded-xl bg-slate-50 p-4 md:flex-row md:items-center">
              <div>
                <p className="font-bold text-slate-950">{item.topic}</p>
                <p className="text-sm text-slate-500">{item.clientId?.businessName} · {item.platform} · {item.contentType} · {new Date(item.postDate || item.date).toLocaleDateString()} · {item.status} · {item.approvalStatus}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => editItem(item)}>Edit</Button>
                <Button variant="danger" onClick={() => deleteItem(item._id)}>Delete</Button>
              </div>
            </div>
          )) : <EmptyState title="No calendar plans" message="Add your first content plan for this month." />}
        </div>
      </section>
    </div>
  );
}
