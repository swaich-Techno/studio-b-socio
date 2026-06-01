import Button from "@/components/Button";

export default function ClientCard({ client, onDelete, canDelete = false, canEdit = false }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-950">{client.businessName}</h3>
          <p className="mt-1 text-sm text-slate-500">{client.industry} · {client.location || "No location"}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${client.status === "Active" ? "bg-accent-soft text-accent-dark" : "bg-slate-100 text-slate-600"}`}>
          {client.status}
        </span>
      </div>
      <dl className="mt-5 grid gap-2 text-sm text-slate-600">
        <div><span className="font-semibold text-slate-800">Contact:</span> {client.contactPerson || "Not added"}</div>
        <div><span className="font-semibold text-slate-800">Phone:</span> {client.phone || "Not added"}</div>
        <div><span className="font-semibold text-slate-800">Instagram:</span> {client.instagramHandle || "Not added"}</div>
        <div><span className="font-semibold text-slate-800">Facebook:</span> {client.facebookPage || "Not added"}</div>
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button href={`/clients/${client._id}`}>View</Button>
        {canEdit ? <Button href={`/clients/new?id=${client._id}`} variant="secondary">Edit</Button> : null}
        {canDelete ? <Button variant="danger" onClick={() => onDelete(client._id)}>Delete</Button> : null}
      </div>
    </article>
  );
}
