"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import DashboardCard from "@/components/DashboardCard";
import EmptyState from "@/components/EmptyState";
import Loading from "@/components/Loading";

function sum(invoices, key) {
  return invoices.reduce((total, invoice) => total + Number(invoice[key] || 0), 0);
}

function balance(invoice) {
  return Math.max(Number(invoice.amount || 0) - Number(invoice.paidAmount || 0), 0);
}

function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function cleanPhone(value = "") {
  return value.replace(/[^\d]/g, "");
}

function shareText(invoice) {
  return `Hello ${invoice.clientId?.businessName || "there"}, invoice ${invoice.invoiceNumber || invoice._id} from B Socio Studio is ready. Total: ${formatMoney(invoice.amount)}. Balance due: ${formatMoney(balance(invoice))}.`;
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState(null);
  const [message, setMessage] = useState("");
  const [origin, setOrigin] = useState("");

  async function loadInvoices() {
    const response = await fetch("/api/invoices");
    const data = await response.json();
    setInvoices(data.invoices || []);
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    loadInvoices();
  }, []);

  async function deleteInvoice(id) {
    if (!confirm("Delete this invoice permanently?")) return;
    const response = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    const result = await response.json();
    setMessage(response.ok ? "Invoice deleted." : result.error || "Could not delete invoice.");
    loadInvoices();
  }

  if (!invoices) return <Loading label="Loading billing..." />;

  const unpaid = invoices.filter((invoice) => invoice.status !== "Paid" && invoice.status !== "Cancelled");
  const outstanding = unpaid.reduce((total, invoice) => total + balance(invoice), 0);

  return (
    <div className="page-container">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Invoice maker</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Billing</h1>
          <p className="mt-2 text-slate-500">Create itemized invoices, print/save as PDF, and share with clients through email or WhatsApp.</p>
        </div>
        <Button href="/billing/new">Create Invoice</Button>
      </div>

      {message ? <p className="mt-5 rounded-xl bg-accent-soft p-3 text-sm font-semibold text-accent-dark">{message}</p> : null}

      <div className="mt-8 grid gap-5 md:grid-cols-4">
        <DashboardCard label="Total invoiced" value={formatMoney(sum(invoices, "amount"))} />
        <DashboardCard label="Total paid" value={formatMoney(sum(invoices, "paidAmount"))} />
        <DashboardCard label="Outstanding" value={formatMoney(outstanding)} />
        <DashboardCard label="Unpaid invoices" value={unpaid.length} />
      </div>

      <section className="mt-8 card p-5">
        <h2 className="text-xl font-bold text-slate-950">Invoices</h2>
        <div className="mt-4 overflow-x-auto">
          {invoices.length ? (
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="p-3">Invoice</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Package</th>
                  <th className="p-3">Month</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Paid</th>
                  <th className="p-3">Balance</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const phone = cleanPhone(invoice.customerWhatsapp || invoice.clientId?.whatsappNumber || invoice.clientId?.phone);
                  const email = invoice.customerEmail || invoice.clientId?.email || "";
                  const subject = `Invoice ${invoice.invoiceNumber || invoice._id} from B Socio Studio`;
                  const text = shareText(invoice);
                  const invoiceUrl = `${origin}/billing/${invoice._id}`;
                  const emailHref = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${text}\n\nOpen invoice: ${invoiceUrl}\nPlease attach the saved PDF if required.`)}`;
                  const whatsappHref = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(`${text}\n\nOpen invoice: ${invoiceUrl}`)}` : "";

                  return (
                    <tr key={invoice._id} className="border-t border-slate-100">
                      <td className="p-3 font-semibold">{invoice.invoiceNumber || invoice._id}</td>
                      <td className="p-3 font-semibold">{invoice.clientId?.businessName}</td>
                      <td className="p-3">{invoice.packageId?.name || "Custom"}</td>
                      <td className="p-3">{invoice.month}/{invoice.year}</td>
                      <td className="p-3">{formatMoney(invoice.amount)}</td>
                      <td className="p-3">{formatMoney(invoice.paidAmount)}</td>
                      <td className="p-3">{formatMoney(balance(invoice))}</td>
                      <td className="p-3">{invoice.status}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <Button href={`/billing/${invoice._id}`} variant="secondary">View/PDF</Button>
                          {email ? <Button href={emailHref} variant="secondary">Email</Button> : null}
                          {whatsappHref ? <Button href={whatsappHref} variant="secondary" target="_blank">WhatsApp</Button> : null}
                          <Button variant="danger" onClick={() => deleteInvoice(invoice._id)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <EmptyState title="No invoices yet" message="Create your first monthly client invoice." actionHref="/billing/new" actionLabel="Create Invoice" />}
        </div>
      </section>
    </div>
  );
}
