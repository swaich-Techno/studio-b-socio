"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import ClientCard from "@/components/ClientCard";
import EmptyState from "@/components/EmptyState";
import Loading from "@/components/Loading";

export default function ClientsPage() {
  const [clients, setClients] = useState(null);
  const [meta, setMeta] = useState({ canDeleteClients: false, canManageClients: false });

  async function loadClients() {
    const response = await fetch("/api/clients");
    const data = await response.json();
    setClients(data.clients || []);
    setMeta(data.meta || { canDeleteClients: false, canManageClients: false });
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function deleteClient(id) {
    if (!confirm("Delete this client? Related content will remain for reporting history.")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    loadClients();
  }

  if (!clients) return <Loading label="Loading clients..." />;

  return (
    <div className="page-container">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Clients</h1>
          <p className="mt-2 text-slate-500">Manage business profiles, brand notes, and contact details.</p>
        </div>
        {meta.canManageClients ? <Button href="/clients/new">Add Client</Button> : null}
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {clients.length ? clients.map((client) => (
          <ClientCard key={client._id} client={client} onDelete={deleteClient} canDelete={meta.canDeleteClients} canEdit={meta.canManageClients} />
        )) : (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState title="No clients yet" message="Add your first shop, restaurant, salon, gym, clinic, or local business." actionHref="/clients/new" actionLabel="Add Client" />
          </div>
        )}
      </div>
    </div>
  );
}
