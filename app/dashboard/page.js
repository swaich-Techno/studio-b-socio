"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import DashboardCard from "@/components/DashboardCard";
import EmptyState from "@/components/EmptyState";
import Loading from "@/components/Loading";

const onboardingSteps = [
  ["hasClients", "Add your first client"],
  ["hasTeam", "Approve or add your team"],
  ["hasContent", "Schedule first content"],
  ["hasAnalytics", "Add first analytics record"],
  ["hasLeadPipeline", "Add a lead in client pipeline"]
];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [range, setRange] = useState("week");
  const [assignedTo, setAssignedTo] = useState("");

  useEffect(() => {
    const params = new URLSearchParams({ range });
    if (assignedTo) params.set("assignedTo", assignedTo);
    fetch(`/api/dashboard?${params}`).then((res) => res.json()).then(setData);
  }, [range, assignedTo]);

  if (!data) return <Loading label="Loading dashboard..." />;

  const teamNames = data.teamWorkload?.map((member) => member.name) || [];
  const incompleteSteps = onboardingSteps.filter(([key]) => !data.onboarding?.[key]);

  return (
    <div className="page-container">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Agency dashboard</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">B Socio Studio</h1>
          <p className="mt-2 text-slate-500">Plan content, track team work, and prepare client reports from one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/clients/new">Add Client</Button>
          <Button href="/content-generator" variant="secondary">Generate Content</Button>
          <Button href="/reels" variant="secondary">Reels</Button>
          <Button href="/ai-image-studio" variant="secondary">AI Image</Button>
          <Button href="/catalogues" variant="secondary">Catalogues</Button>
          <Button href="/financials" variant="secondary">Financials</Button>
          <Button href="/analytics" variant="secondary">Add Analytics</Button>
          <Button href="/reports" variant="secondary">Create Report</Button>
        </div>
      </div>

      <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft md:flex-row md:items-center">
        <span className="text-sm font-bold text-slate-700">Dashboard filters</span>
        <select value={range} onChange={(event) => setRange(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft">
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
        <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft">
          <option value="">All team members</option>
          {teamNames.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </section>

      {incompleteSteps.length ? (
        <section className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <h2 className="font-black text-amber-950">Admin onboarding checklist</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-5">
            {onboardingSteps.map(([key, label]) => (
              <div key={key} className={`rounded-xl p-3 text-sm font-semibold ${data.onboarding?.[key] ? "bg-white text-emerald-700" : "bg-amber-100 text-amber-900"}`}>
                {data.onboarding?.[key] ? "Done: " : "Next: "}{label}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-8 grid gap-5 md:grid-cols-3 xl:grid-cols-6">
        <DashboardCard label="Total clients" value={data.stats.totalClients} helper="Active and paused" />
        <DashboardCard label="Active clients" value={data.stats.activeClients} helper="Currently live" />
        <DashboardCard label="Pending approvals" value={data.stats.pendingApprovals} helper="Needs review" />
        <DashboardCard label="This Month Revenue" value={`₹${data.stats.thisMonthRevenue || 0}`} helper="Paid amount" />
        <DashboardCard label="Outstanding Balance" value={`₹${data.stats.outstandingBalance || 0}`} helper="Client balances + invoices" />
        <DashboardCard label="Content Scheduled" value={data.stats.postsScheduledThisWeek} helper={range === "month" ? "Next 30 days" : "This week"} />
        <DashboardCard label="Reels in editing" value={data.stats.reelsInEditing} helper="Editing or review" />
        <DashboardCard label="Tasks Due" value={data.stats.pendingTasks} helper={assignedTo || "Needs action"} />
        <DashboardCard label="Leads Generated" value={data.stats.leadsGenerated || 0} helper="This month" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-xl font-bold text-slate-950">Upcoming scheduled content</h2>
          <div className="mt-4 grid gap-3">
            {data.upcoming.length ? data.upcoming.map((item) => (
              <div key={item._id} className="rounded-xl bg-slate-50 p-4 text-sm">
                <p className="font-bold text-slate-900">{item.topic}</p>
                <p className="mt-1 text-slate-500">{item.clientId?.businessName} - {item.platform} - {new Date(item.postDate || item.date).toLocaleDateString()}</p>
              </div>
            )) : <EmptyState title="No upcoming content" message="Add content plans to see the next scheduled work here." actionHref="/calendar" actionLabel="Open Calendar" />}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-xl font-bold text-slate-950">Renewal reminders</h2>
          <div className="mt-4 grid gap-3">
            {data.upcomingRenewals?.length ? data.upcomingRenewals.map((client) => (
              <a key={client._id} href={`/clients/${client._id}`} className="rounded-xl bg-slate-50 p-4 text-sm hover:bg-slate-100">
                <p className="font-bold text-slate-900">{client.businessName}</p>
                <p className="mt-1 text-slate-500">Renewal: {new Date(client.renewalDate).toLocaleDateString()}</p>
              </a>
            )) : <EmptyState title="No renewals due" message="Clients with upcoming renewal dates will appear here." />}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-xl font-bold text-slate-950">Team workload</h2>
          <div className="mt-4 grid gap-3">
            {data.teamWorkload?.length ? data.teamWorkload.map((member) => (
              <div key={member.name} className="rounded-xl bg-slate-50 p-4 text-sm">
                <p className="font-bold text-slate-900">{member.name}</p>
                <p className="mt-1 text-slate-500">{member.role} - {member.assignedClients} assigned clients</p>
              </div>
            )) : <EmptyState title="No team members" message="Add your team to see workload here." actionHref="/team/new" actionLabel="Add Team" />}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-xl font-bold text-slate-950">Recent analytics</h2>
          <div className="mt-4 grid gap-3">
            {data.recentAnalytics?.length ? data.recentAnalytics.map((item) => (
              <div key={item._id} className="rounded-xl bg-slate-50 p-4 text-sm">
                <p className="font-bold text-slate-900">{item.clientId?.businessName || "Client"} - {item.platform}</p>
                <p className="mt-1 text-slate-500">Reach {item.reach} - Leads {item.leads} - {new Date(item.date).toLocaleDateString()}</p>
              </div>
            )) : <EmptyState title="No analytics yet" message="Add manual performance records to see recent analytics." actionHref="/analytics" actionLabel="Add Analytics" />}
          </div>
        </section>
      </div>
    </div>
  );
}
