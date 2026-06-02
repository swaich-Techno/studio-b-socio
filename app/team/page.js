"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/Button";
import DashboardCard from "@/components/DashboardCard";
import EmptyState from "@/components/EmptyState";
import Loading from "@/components/Loading";

const categories = ["Design", "Reel", "Caption", "Posting", "Shooting", "Ads", "Client Coordination", "Report"];
const priorities = ["Low", "Medium", "High"];

function nextWeekDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function statusBadge(status) {
  if (status === "approved") return "bg-accent-soft text-accent-dark";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

export default function TeamPage() {
  const [team, setTeam] = useState(null);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [meta, setMeta] = useState({ canManageTeam: false, currentUserId: "" });
  const [assigningTo, setAssigningTo] = useState("");
  const [message, setMessage] = useState("");
  const [taskForm, setTaskForm] = useState({
    title: "",
    clientId: "",
    category: "Design",
    dueDate: nextWeekDate(),
    priority: "Medium",
    notes: ""
  });

  async function loadTeam() {
    const [teamRes, clientRes, taskRes] = await Promise.all([
      fetch("/api/team", { cache: "no-store" }),
      fetch("/api/clients", { cache: "no-store" }),
      fetch("/api/tasks", { cache: "no-store" })
    ]);
    const [teamData, clientData, taskData] = await Promise.all([teamRes.json(), clientRes.json(), taskRes.json()]);
    setTeam(teamData.team || []);
    setMeta(teamData.meta || { canManageTeam: false, currentUserId: "" });
    setClients(clientData.clients || []);
    setTasks(taskData.tasks || []);
  }

  useEffect(() => {
    loadTeam();
  }, []);

  async function deleteMember(id) {
    if (!confirm("Delete this team member?")) return;
    const response = await fetch(`/api/team/${id}`, { method: "DELETE" });
    const result = await response.json();
    setMessage(response.ok ? "Team member deleted." : result.error || "Could not delete team member.");
    loadTeam();
  }

  async function updateMember(member, changes) {
    const response = await fetch(`/api/team/${member._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...member,
        assignedClients: (member.assignedClients || []).map((client) => client._id || client),
        skills: member.skills || [],
        permissions: member.permissions || {},
        ...changes
      })
    });
    const result = await response.json();
    setMessage(response.ok ? "Team member updated." : result.error || "Could not update team member.");
    loadTeam();
  }

  function startAssignTask(member) {
    setAssigningTo(member.name);
    setTaskForm((current) => ({
      ...current,
      title: "",
      clientId: member.assignedClients?.[0]?._id || member.assignedClients?.[0] || clients[0]?._id || "",
      category: member.role?.includes("Reel") ? "Reel" : member.role?.includes("Ads") ? "Ads" : "Design"
    }));
  }

  async function assignTask(event) {
    event.preventDefault();
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...taskForm,
        assignedTo: assigningTo,
        status: "Not Started"
      })
    });
    const result = await response.json();
    setMessage(response.ok ? `Task assigned to ${assigningTo}.` : result.error || "Could not assign task.");
    if (response.ok) {
      setAssigningTo("");
      setTaskForm({ title: "", clientId: "", category: "Design", dueDate: nextWeekDate(), priority: "Medium", notes: "" });
    }
    loadTeam();
  }

  const stats = useMemo(() => {
    const list = team || [];
    return {
      total: list.length,
      pending: list.filter((member) => member.status === "pending").length,
      approved: list.filter((member) => member.status === "approved").length,
      suspended: list.filter((member) => member.status === "suspended").length,
      openTasks: tasks.filter((task) => task.status !== "Completed").length
    };
  }, [team, tasks]);

  if (!team) return <Loading label="Loading team..." />;

  const pendingMembers = team.filter((member) => member.status === "pending");
  const approvedMembers = team.filter((member) => member.status === "approved");
  const otherMembers = team.filter((member) => !["pending", "approved"].includes(member.status));
  const visibleMembers = [...approvedMembers, ...otherMembers];

  return (
    <div className="page-container">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Team operations</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Team</h1>
          <p className="mt-2 text-slate-500">{meta.canManageTeam ? "Approve users, assign roles, connect clients, and appoint tasks from one admin hub." : "View approved team members, roles, skills, and availability."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {meta.canManageTeam ? <Button href="/team/new">Add Team Member</Button> : null}
          <Button href="/tasks" variant="secondary">Open Tasks</Button>
          <Button href="/approvals" variant="secondary">Approvals</Button>
        </div>
      </div>

      {message ? <p className="mt-5 rounded-xl bg-accent-soft p-3 text-sm font-semibold text-accent-dark">{message}</p> : null}

      <div className="mt-8 grid gap-5 md:grid-cols-5">
        <DashboardCard label="Total team" value={stats.total} />
        <DashboardCard label="Pending approval" value={stats.pending} />
        <DashboardCard label="Approved" value={stats.approved} />
        <DashboardCard label="Suspended" value={stats.suspended} />
        <DashboardCard label="Open tasks" value={stats.openTasks} />
      </div>

      {meta.canManageTeam && pendingMembers.length ? (
        <section className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <h2 className="text-xl font-black text-amber-950">Pending team approvals</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingMembers.map((member) => (
              <article key={member._id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-950">{member.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{member.email || "Email hidden"} - {member.role}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">pending</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">Email verified: {member.emailVerified ? "Yes" : "No"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => updateMember(member, { status: "approved" })}>Approve</Button>
                  <Button variant="danger" onClick={() => updateMember(member, { status: "rejected" })}>Reject</Button>
                  <Button href={`/team/new?id=${member._id}`} variant="secondary">Set Role</Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {meta.canManageTeam && assigningTo ? (
        <form onSubmit={assignTask} className="mt-8 grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-3">
          <div className="md:col-span-3">
            <h2 className="text-xl font-black text-slate-950">Assign task to {assigningTo}</h2>
            <p className="mt-1 text-sm text-slate-500">Create a team task and notify the assigned member.</p>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Task Title
            <input value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Client
            <select value={taskForm.clientId} onChange={(event) => setTaskForm({ ...taskForm, clientId: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" required>
              <option value="">Select Client</option>
              {clients.map((client) => <option key={client._id} value={client._id}>{client.businessName}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Category
            <select value={taskForm.category} onChange={(event) => setTaskForm({ ...taskForm, category: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft">
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Due Date
            <input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Priority
            <select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft">
              {priorities.map((priority) => <option key={priority}>{priority}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700 md:col-span-3">
            Notes
            <textarea value={taskForm.notes} onChange={(event) => setTaskForm({ ...taskForm, notes: event.target.value })} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" />
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-3">
            <Button type="submit">Assign Task</Button>
            <Button type="button" variant="secondary" onClick={() => setAssigningTo("")}>Cancel</Button>
          </div>
        </form>
      ) : null}

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleMembers.length ? visibleMembers.map((member) => {
          const memberTasks = tasks.filter((task) => task.assignedTo === member.name && task.status !== "Completed");
          return (
            <article key={member._id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">{member.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{member.role} - {member.status}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadge(member.status)}`}>{member.status}</span>
              </div>

              {member.email || member.phone ? (
                <p className="mt-4 text-sm text-slate-600">{member.email || "No email"} - {member.phone || "No phone"}</p>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Contact details are private.</p>
              )}

              <p className="mt-2 text-sm text-slate-600">Skills: {(member.skills || []).join(", ") || "Not added"}</p>
              <p className="mt-2 text-sm text-slate-600">Availability: {member.chatStatus || "Available"}</p>
              <p className="mt-2 text-sm text-slate-600">Assigned clients: {member.assignedClients?.length || 0}</p>
              <p className="mt-2 text-sm text-slate-600">Open tasks: {memberTasks.length}</p>

              {memberTasks.length ? (
                <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                  {memberTasks.slice(0, 3).map((task) => (
                    <p key={task._id} className="text-slate-600"><span className="font-bold text-slate-900">{task.title}</span> - {task.status}</p>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {meta.canManageTeam && member.status === "approved" ? <Button onClick={() => startAssignTask(member)}>Assign Task</Button> : null}
                {meta.canManageTeam && member.status === "approved" ? <Button variant="secondary" onClick={() => updateMember(member, { status: "suspended" })}>Suspend</Button> : null}
                {meta.canManageTeam || meta.currentUserId === member._id ? <Button href={`/team/${member._id}`} variant="secondary">View</Button> : null}
                {meta.canManageTeam ? <Button href={`/team/new?id=${member._id}`} variant="secondary">Edit Role</Button> : null}
                {meta.canManageTeam ? <Button variant="danger" onClick={() => deleteMember(member._id)}>Delete</Button> : null}
              </div>
            </article>
          );
        }) : (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState title="No approved team members yet" message={meta.canManageTeam ? "Approve pending users or add a team member." : "No approved team directory is available yet."} actionHref={meta.canManageTeam ? "/team/new" : undefined} actionLabel="Add Team Member" />
          </div>
        )}
      </div>
    </div>
  );
}
