"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import Loading from "@/components/Loading";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(null);

  async function loadNotifications() {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    const data = await response.json();
    setNotifications(data.notifications || []);
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    loadNotifications();
  }

  if (!notifications) return <Loading label="Loading notifications..." />;

  return (
    <div className="page-container">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Notifications</h1>
          <p className="mt-2 text-slate-500">Approval requests, reminders, task updates, and account alerts.</p>
        </div>
        <Button variant="secondary" onClick={markAllRead}>Mark All Read</Button>
      </div>
      <div className="mt-8 grid gap-3">
        {notifications.length ? notifications.map((item) => (
          <a key={item._id} href={item.href || "#"} className={`rounded-2xl border p-4 shadow-sm ${item.readAt ? "border-slate-100 bg-white" : "border-accent-soft bg-accent-soft/40"}`}>
            <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
              <div>
                <p className="font-bold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.message}</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.type}</span>
            </div>
          </a>
        )) : <EmptyState title="No notifications" message="Important account, approval, and reminder updates will appear here." />}
      </div>
    </div>
  );
}
