"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/Button";
import Loading from "@/components/Loading";

export default function TeamDetailPage() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [meta, setMeta] = useState({ canManageTeam: false });

  useEffect(() => {
    fetch(`/api/team/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setMember(data.member);
        setMeta(data.meta || { canManageTeam: false });
      });
  }, [id]);

  if (!member) return <Loading label="Loading team member..." />;

  return (
    <div className="page-container">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-black text-slate-950">{member.name}</h1>
          <p className="mt-2 text-slate-500">{member.role} - {member.status}</p>
        </div>
        {meta.canManageTeam ? <Button href={`/team/new?id=${member._id}`}>Edit Member</Button> : null}
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-bold text-slate-950">Profile</h2>
          {member.email || member.phone ? (
            <>
              <p className="mt-3 text-sm text-slate-600">Email: {member.email || "Not added"}</p>
              <p className="mt-2 text-sm text-slate-600">Phone: {member.phone || "Not added"}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Contact details are private for team members.</p>
          )}
          <p className="mt-2 text-sm text-slate-600">Availability: {member.chatStatus || "Available"}</p>
          <p className="mt-2 text-sm text-slate-600">Skills: {(member.skills || []).join(", ") || "Not added"}</p>
        </section>
        <section className="card p-5">
          <h2 className="font-bold text-slate-950">Assigned Clients</h2>
          <div className="mt-3 grid gap-2">
            {(member.assignedClients || []).length ? member.assignedClients.map((client) => (
              <p key={client._id || client} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{client.businessName || client}</p>
            )) : <p className="text-sm text-slate-500">No assigned clients.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
