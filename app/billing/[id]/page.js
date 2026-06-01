"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/Button";
import Loading from "@/components/Loading";

function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value) {
  if (!value) return "Not added";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function cleanPhone(value = "") {
  return value.replace(/[^\d]/g, "");
}

function defaultLineItems(invoice) {
  if (invoice.lineItems?.length) return invoice.lineItems;
  return [
    {
      description: invoice.packageId?.name || invoice.notes || "Marketing services",
      quantity: 1,
      rate: Number(invoice.amount || 0),
      amount: Number(invoice.amount || 0)
    }
  ];
}

export default function InvoiceViewPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");

  useEffect(() => {
    setInvoiceUrl(window.location.href);
    fetch(`/api/invoices/${id}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Invoice not found.");
        return;
      }
      setInvoice(data.invoice);
    });
  }, [id]);

  const lineItems = useMemo(() => invoice ? defaultLineItems(invoice) : [], [invoice]);

  if (error) {
    return (
      <div className="page-container">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">{error}</div>
      </div>
    );
  }

  if (!invoice) return <Loading label="Loading invoice..." />;

  const client = invoice.clientId || {};
  const balance = Math.max(Number(invoice.amount || 0) - Number(invoice.paidAmount || 0), 0);
  const phone = cleanPhone(invoice.customerWhatsapp || client.whatsappNumber || client.phone);
  const email = invoice.customerEmail || client.email || "";
  const subject = `Invoice ${invoice.invoiceNumber || invoice._id} from B Socio Studio`;
  const shareMessage = `Hello ${client.contactPerson || client.businessName || "there"}, please find invoice ${invoice.invoiceNumber || invoice._id} for ${formatMoney(invoice.amount)}. Balance due: ${formatMoney(balance)}. View/print PDF: ${invoiceUrl}`;
  const emailHref = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareMessage)}`;
  const whatsappHref = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(shareMessage)}` : "";

  return (
    <div className="page-container">
      <div className="no-print mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Invoice PDF</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Invoice {invoice.invoiceNumber || invoice._id}</h1>
          <p className="mt-2 text-slate-500">Use print to save as PDF, then share by email or WhatsApp.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.print()}>Print / Save PDF</Button>
          <Button href={emailHref} variant="secondary">Email Client</Button>
          {whatsappHref ? <Button href={whatsappHref} variant="secondary" target="_blank">WhatsApp Client</Button> : null}
          <Button href="/billing" variant="secondary">Back to Billing</Button>
        </div>
      </div>

      <article className="mx-auto max-w-4xl rounded-2xl border border-slate-100 bg-white p-6 shadow-soft print:rounded-none print:border-0 print:shadow-none md:p-10">
        <header className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 md:flex-row">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">B Socio Studio</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">Invoice</h2>
            <p className="mt-2 text-sm text-slate-500">Be Seen. Be Social.</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-sm text-slate-500">Invoice No.</p>
            <p className="text-lg font-black text-slate-950">{invoice.invoiceNumber || invoice._id}</p>
            <p className="mt-3 text-sm text-slate-500">Issue Date: {formatDate(invoice.issueDate || invoice.createdAt)}</p>
            <p className="text-sm text-slate-500">Due Date: {formatDate(invoice.dueDate)}</p>
            <p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{invoice.status}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-slate-200 py-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">Bill From</p>
            <p className="mt-3 font-black text-slate-950">{invoice.billingFrom || "B Socio Studio"}</p>
            {invoice.billingAddress ? <p className="mt-1 text-sm text-slate-600">{invoice.billingAddress}</p> : null}
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">Bill To</p>
            <p className="mt-3 font-black text-slate-950">{client.businessName || "Client"}</p>
            {client.contactPerson ? <p className="mt-1 text-sm text-slate-600">Contact: {client.contactPerson}</p> : null}
            {client.location ? <p className="mt-1 text-sm text-slate-600">{client.location}</p> : null}
            {email ? <p className="mt-1 text-sm text-slate-600">{email}</p> : null}
            {phone ? <p className="mt-1 text-sm text-slate-600">WhatsApp: {phone}</p> : null}
          </div>
        </section>

        <section className="py-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-3">Description</th>
                  <th className="px-3 py-3 text-right">Qty</th>
                  <th className="px-3 py-3 text-right">Rate</th>
                  <th className="py-3 pl-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item._id || item.description} className="border-b border-slate-100">
                    <td className="py-4 pr-3 font-semibold text-slate-900">{item.description}</td>
                    <td className="px-3 py-4 text-right">{item.quantity || 1}</td>
                    <td className="px-3 py-4 text-right">{formatMoney(item.rate)}</td>
                    <td className="py-4 pl-3 text-right font-bold">{formatMoney(item.amount || Number(item.quantity || 1) * Number(item.rate || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex justify-end border-b border-slate-200 pb-8">
          <div className="w-full max-w-sm space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-bold">{formatMoney(invoice.subtotal || invoice.amount)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="font-bold">{formatMoney(invoice.discount)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Tax</span><span className="font-bold">{formatMoney(invoice.tax)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-lg"><span className="font-black text-slate-950">Total</span><span className="font-black text-slate-950">{formatMoney(invoice.amount)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Paid</span><span className="font-bold">{formatMoney(invoice.paidAmount)}</span></div>
            <div className="flex justify-between rounded-xl bg-slate-950 p-4 text-white"><span className="font-bold">Balance Due</span><span className="font-black">{formatMoney(balance)}</span></div>
          </div>
        </section>

        {invoice.notes ? (
          <section className="pt-8">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">Notes</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{invoice.notes}</p>
          </section>
        ) : null}
      </article>
    </div>
  );
}
