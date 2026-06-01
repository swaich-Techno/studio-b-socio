"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import Loading from "@/components/Loading";

function ApprovalSection({ title, items, type, render, onAction }) {
  return (
    <section className="card p-5">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.length ? items.map((item) => (
          <article key={item._id} className="rounded-xl bg-slate-50 p-4">
            {render(item)}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => onAction(type, item._id, "approve")}>Approve</Button>
              <Button variant="danger" onClick={() => onAction(type, item._id, "reject")}>Reject</Button>
            </div>
          </article>
        )) : <p className="text-sm text-slate-500">Nothing waiting here.</p>}
      </div>
    </section>
  );
}

export default function ApprovalsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function loadApprovals() {
    const response = await fetch("/api/approvals");
    const result = await response.json();
    if (!response.ok) setError(result.error || "Could not load approvals.");
    setData(result);
  }

  useEffect(() => {
    loadApprovals();
  }, []);

  async function updateApproval(type, id, action) {
    const response = await fetch("/api/approvals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, action })
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "Approval update failed.");
    } else {
      setError("");
    }
    loadApprovals();
  }

  if (!data && !error) return <Loading label="Loading approvals..." />;

  return (
    <div className="page-container">
      <h1 className="text-3xl font-black text-slate-950">Approvals</h1>
      <p className="mt-2 text-slate-500">Review posts, captions, reels, client approvals, and pending team accounts.</p>
      {error ? <div className="mt-6"><EmptyState title="No approval access" message={error} /></div> : null}
      {data ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <ApprovalSection title="Team member approval requests" type="user" items={data.pendingUsers || []} onAction={updateApproval} render={(user) => (
            <div><p className="font-bold text-slate-950">{user.name}</p><p className="text-sm text-slate-500">{user.email} - {user.role} - {user.emailVerified ? "Email verified" : "Email not verified"}</p></div>
          )} />
          <ApprovalSection title="Posts waiting approval" type="calendar" items={data.calendarApprovals || []} onAction={updateApproval} render={(item) => (
            <div><p className="font-bold text-slate-950">{item.topic}</p><p className="text-sm text-slate-500">{item.clientId?.businessName} · {item.platform} · {item.approvalStatus}</p></div>
          )} />
          <ApprovalSection title="Captions waiting approval" type="content" items={data.contentApprovals || []} onAction={updateApproval} render={(item) => (
            <div><p className="font-bold text-slate-950">{item.clientId?.businessName} · {item.platform}</p><p className="text-sm text-slate-500">{item.captions?.[0] || item.ideas?.[0]}</p></div>
          )} />
          <ApprovalSection title="Reels waiting approval" type="reel" items={data.reelApprovals || []} onAction={updateApproval} render={(item) => (
            <div><p className="font-bold text-slate-950">{item.clientId?.businessName} · {item.productName}</p><p className="text-sm text-slate-500">{item.hook}</p></div>
          )} />
          <ApprovalSection title="Client approvals pending" type="clientApproval" items={data.clientApprovals || []} onAction={updateApproval} render={(item) => (
            <div><p className="font-bold text-slate-950">{item.clientId?.businessName} · {item.contentType}</p><p className="text-sm text-slate-500">{item.status}</p></div>
          )} />
        </div>
      ) : null}
    </div>
  );
}
