"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/Button";
import DashboardCard from "@/components/DashboardCard";
import EmptyState from "@/components/EmptyState";
import Loading from "@/components/Loading";

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function invoiceBalance(invoice) {
  return Math.max(Number(invoice.amount || 0) - Number(invoice.paidAmount || 0), 0);
}

function formatDate(value) {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function FinancialsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFinancials() {
      const [invoiceRes, clientRes, packageRes] = await Promise.all([
        fetch("/api/invoices", { cache: "no-store" }),
        fetch("/api/clients", { cache: "no-store" }),
        fetch("/api/packages", { cache: "no-store" })
      ]);
      const [invoiceData, clientData, packageData] = await Promise.all([
        invoiceRes.json(),
        clientRes.json(),
        packageRes.json()
      ]);
      if (!invoiceRes.ok) {
        setError(invoiceData.error || "You do not have permission to view financials.");
        setData({ invoices: [], clients: [], packages: [] });
        return;
      }
      setData({
        invoices: invoiceData.invoices || [],
        clients: clientData.clients || [],
        packages: packageRes.ok ? packageData.packages || [] : []
      });
    }
    loadFinancials();
  }, []);

  const stats = useMemo(() => {
    const invoices = data?.invoices || [];
    const clients = data?.clients || [];
    const unpaid = invoices.filter((invoice) => invoice.status !== "Paid" && invoice.status !== "Cancelled");
    const invoiceOutstanding = unpaid.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
    const clientOutstanding = clients.reduce((sum, client) => sum + Number(client.balancePending || 0), 0);
    return {
      totalInvoiced: invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
      paid: invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0),
      outstanding: Math.max(invoiceOutstanding, clientOutstanding),
      unpaidCount: unpaid.length,
      monthlyFees: clients.reduce((sum, client) => sum + Number(client.monthlyFee || 0), 0),
      packageCount: data?.packages?.length || 0
    };
  }, [data]);

  if (!data) return <Loading label="Loading financials..." />;

  const dueInvoices = data.invoices
    .filter((invoice) => invoice.status !== "Paid" && invoice.status !== "Cancelled")
    .sort((a, b) => new Date(a.dueDate || a.createdAt) - new Date(b.dueDate || b.createdAt))
    .slice(0, 6);
  const topBalances = data.clients
    .filter((client) => Number(client.balancePending || 0) > 0)
    .sort((a, b) => Number(b.balancePending || 0) - Number(a.balancePending || 0))
    .slice(0, 6);

  return (
    <div className="page-container">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Agency finance</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Financials</h1>
          <p className="mt-2 text-slate-500">Track invoices, outstanding balances, client fees, packages, and payment follow-ups.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/billing/new">Create Invoice</Button>
          <Button href="/billing" variant="secondary">Invoice List</Button>
          <Button href="/packages" variant="secondary">Packages</Button>
        </div>
      </div>

      {error ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="mt-8 grid gap-5 md:grid-cols-3 xl:grid-cols-6">
        <DashboardCard label="Total invoiced" value={formatMoney(stats.totalInvoiced)} />
        <DashboardCard label="Paid collected" value={formatMoney(stats.paid)} />
        <DashboardCard label="Outstanding" value={formatMoney(stats.outstanding)} />
        <DashboardCard label="Unpaid invoices" value={stats.unpaidCount} />
        <DashboardCard label="Monthly fees" value={formatMoney(stats.monthlyFees)} />
        <DashboardCard label="Packages" value={stats.packageCount} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-xl font-bold text-slate-950">Payment follow-ups</h2>
          <div className="mt-4 grid gap-3">
            {dueInvoices.length ? dueInvoices.map((invoice) => (
              <a key={invoice._id} href={`/billing/${invoice._id}`} className="rounded-xl bg-slate-50 p-4 text-sm hover:bg-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{invoice.clientId?.businessName || "Client"} - {invoice.invoiceNumber || "Invoice"}</p>
                    <p className="mt-1 text-slate-500">Due: {formatDate(invoice.dueDate)} - Status: {invoice.status}</p>
                  </div>
                  <span className="font-black text-slate-950">{formatMoney(invoiceBalance(invoice))}</span>
                </div>
              </a>
            )) : <EmptyState title="No payment follow-ups" message="Unpaid invoices will appear here." actionHref="/billing/new" actionLabel="Create Invoice" />}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-xl font-bold text-slate-950">Client balances</h2>
          <div className="mt-4 grid gap-3">
            {topBalances.length ? topBalances.map((client) => (
              <a key={client._id} href={`/clients/${client._id}`} className="rounded-xl bg-slate-50 p-4 text-sm hover:bg-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{client.businessName}</p>
                    <p className="mt-1 text-slate-500">Monthly fee: {formatMoney(client.monthlyFee)} - Advance: {formatMoney(client.advancePaid)}</p>
                  </div>
                  <span className="font-black text-slate-950">{formatMoney(client.balancePending)}</span>
                </div>
              </a>
            )) : <EmptyState title="No client balances" message="Client balances from client profiles will appear here." actionHref="/clients" actionLabel="View Clients" />}
          </div>
        </section>
      </div>
    </div>
  );
}
