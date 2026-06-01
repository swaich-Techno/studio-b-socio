"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import FormInput from "@/components/FormInput";
import Loading from "@/components/Loading";

const categories = ["Design", "Reel", "Caption", "Posting", "Shooting", "Ads", "Client Coordination", "Report"];
const priorities = ["Low", "Medium", "High"];
const statuses = ["Not Started", "In Progress", "Need Review", "Revision", "Completed"];
const approvalStatuses = ["Idea", "In Design", "Caption Ready", "Waiting Owner Approval", "Waiting Client Approval", "Approved", "Scheduled", "Posted", "Revision Needed"];

export default function TasksPage() {
  const [clients, setClients] = useState(null);
  const [team, setTeam] = useState([]);
  const [tasks, setTasks] = useState(null);
  const [filters, setFilters] = useState({ assignedTo: "", status: "" });
  const [meta, setMeta] = useState({ canDeleteTasks: false, canAssignTasks: false });

  const loadData = useCallback(async function loadData() {
    const params = new URLSearchParams();
    if (filters.assignedTo) params.set("assignedTo", filters.assignedTo);
    if (filters.status) params.set("status", filters.status);
    const [clientRes, teamRes, taskRes] = await Promise.all([fetch("/api/clients"), fetch("/api/team"), fetch(`/api/tasks?${params}`)]);
    const [clientData, teamData, taskData] = await Promise.all([clientRes.json(), teamRes.json(), taskRes.json()]);
    setClients(clientData.clients || []);
    setTeam(teamData.team || []);
    setTasks(taskData.tasks || []);
    setMeta(taskData.meta || { canDeleteTasks: false, canAssignTasks: false });
  }, [filters.assignedTo, filters.status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    event.currentTarget.reset();
    loadData();
  }

  async function updateStatus(task, status) {
    await fetch(`/api/tasks/${task._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    loadData();
  }

  async function deleteTask(id) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    loadData();
  }

  const grouped = useMemo(() => Object.fromEntries(statuses.map((status) => [status, (tasks || []).filter((task) => task.status === status)])), [tasks]);

  if (!clients || !tasks) return <Loading label="Loading tasks..." />;

  return (
    <div className="page-container">
      <h1 className="text-3xl font-black text-slate-950">Team Tasks</h1>
      <p className="mt-2 text-slate-500">Assign design, reels, captions, posting, shooting, ads, coordination, and report work.</p>

      <div className="mt-6 grid gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-soft md:grid-cols-2">
        <FormInput label="Filter by assigned person" value={filters.assignedTo} onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })} options={team.map((member) => member.name)} />
        <FormInput label="Filter by status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} options={statuses} />
      </div>

      {meta.canAssignTasks ? <form onSubmit={handleSubmit} className="mt-6 grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-3">
        <FormInput label="Task Title" name="title" required />
        <label className="block text-sm font-medium text-slate-700">
          Client
          <select name="clientId" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" required>
            <option value="">Select Client</option>
            {clients.map((client) => <option key={client._id} value={client._id}>{client.businessName}</option>)}
          </select>
        </label>
        <FormInput label="Assigned To" name="assignedTo" options={team.map((member) => member.name)} required />
        <FormInput label="Description" name="description" />
        <FormInput label="Category" name="category" options={categories} />
        <FormInput label="Due Date" name="dueDate" type="date" required />
        <FormInput label="Priority" name="priority" options={priorities} />
        <FormInput label="Status" name="status" options={statuses} />
        <FormInput label="Approval Status" name="approvalStatus" options={approvalStatuses} />
        <FormInput label="Revision Notes" name="revisionNotes" />
        <FormInput label="Attachment/Link" name="attachmentLink" />
        <FormInput className="md:col-span-3" label="Notes" name="notes" textarea />
        <div className="md:col-span-3">
          <Button type="submit">Add Task</Button>
        </div>
      </form> : null}

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {statuses.map((status) => (
          <section key={status} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
            <h2 className="font-bold text-slate-950">{status}</h2>
            <div className="mt-4 grid gap-3">
              {grouped[status].length ? grouped[status].map((task) => (
                <article key={task._id} className="rounded-xl bg-slate-50 p-4">
                  <p className="font-bold text-slate-950">{task.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{task.clientId?.businessName} · {task.assignedTo} · {task.category}</p>
                  <p className="mt-1 text-sm text-slate-500">Due {new Date(task.dueDate).toLocaleDateString()} · {task.priority} · {task.approvalStatus}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {statuses.filter((item) => item !== task.status).map((next) => (
                      <Button key={next} variant="secondary" onClick={() => updateStatus(task, next)}>{next}</Button>
                    ))}
                    {meta.canDeleteTasks ? <Button variant="danger" onClick={() => deleteTask(task._id)}>Delete</Button> : null}
                  </div>
                </article>
              )) : <p className="text-sm text-slate-500">No tasks.</p>}
            </div>
          </section>
        ))}
      </div>
      {!tasks.length ? <div className="mt-6"><EmptyState title="No team tasks yet" message="Create tasks for Aman, Lovejot, or Owner to start tracking work." /></div> : null}
    </div>
  );
}
