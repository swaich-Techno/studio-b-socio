"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import Loading from "@/components/Loading";

export default function TeamPage() {
  const [team, setTeam] = useState(null);
  const [meta, setMeta] = useState({ canManageTeam: false, currentUserId: "" });

  async function loadTeam() {
    const response = await fetch("/api/team");
    const data = await response.json();
    setTeam(data.team || []);
    setMeta(data.meta || { canManageTeam: false, currentUserId: "" });
  }

  useEffect(() => {
    loadTeam();
  }, []);

  async function deleteMember(id) {
    if (!confirm("Delete this team member?")) return;
    await fetch(`/api/team/${id}`, { method: "DELETE" });
    loadTeam();
  }

  async function updateMember(member, changes) {
    await fetch(`/api/team/${member._id}`, {
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
    loadTeam();
  }

  if (!team) return <Loading label="Loading team..." />;

  return (
    <div className="page-container">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Team</h1>
          <p className="mt-2 text-slate-500">{meta.canManageTeam ? "Manage approvals, roles, permissions, skills, and client assignments." : "View approved team members, roles, skills, and availability."}</p>
        </div>
        {meta.canManageTeam ? <Button href="/team/new">Add Team Member</Button> : null}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {team.length ? team.map((member) => (
          <article key={member._id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{member.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{member.role} - {member.status}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${member.status === "approved" ? "bg-accent-soft text-accent-dark" : member.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{member.status}</span>
            </div>

            {member.email || member.phone ? (
              <p className="mt-4 text-sm text-slate-600">{member.email || "No email"} - {member.phone || "No phone"}</p>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Contact details are private.</p>
            )}

            <p className="mt-2 text-sm text-slate-600">Skills: {(member.skills || []).join(", ") || "Not added"}</p>
            <p className="mt-2 text-sm text-slate-600">Availability: {member.chatStatus || "Available"}</p>
            <p className="mt-2 text-sm text-slate-600">Assigned clients: {member.assignedClients?.length || 0}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {meta.canManageTeam && member.status === "pending" ? <Button onClick={() => updateMember(member, { status: "approved" })}>Approve</Button> : null}
              {meta.canManageTeam && member.status === "pending" ? <Button variant="danger" onClick={() => updateMember(member, { status: "rejected" })}>Reject</Button> : null}
              {meta.canManageTeam && member.status === "approved" ? <Button variant="secondary" onClick={() => updateMember(member, { status: "suspended" })}>Suspend</Button> : null}
              {meta.canManageTeam || meta.currentUserId === member._id ? <Button href={`/team/${member._id}`} variant="secondary">View</Button> : null}
              {meta.canManageTeam ? <Button href={`/team/new?id=${member._id}`}>Edit</Button> : null}
              {meta.canManageTeam ? <Button variant="danger" onClick={() => deleteMember(member._id)}>Delete</Button> : null}
            </div>
          </article>
        )) : (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState title="No approved team members yet" message={meta.canManageTeam ? "Approve pending users or add a team member." : "No approved team directory is available yet."} actionHref={meta.canManageTeam ? "/team/new" : undefined} actionLabel="Add Team Member" />
          </div>
        )}
      </div>
    </div>
  );
}
