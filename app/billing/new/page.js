"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import FormInput from "@/components/FormInput";
import Loading from "@/components/Loading";

const statusOptions = ["Unpaid", "Partially Paid", "Paid", "Overdue", "Cancelled"];

function nextWeek() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function cleanPhone(value = "") {
  return value.replace(/[^\d]/g, "");
}

function createInitialForm() {
  const now = new Date();
  return {
    clientId: "",
    packageId: "",
    invoiceNumber: `BSS-${now.getTime().toString().slice(-6)}`,
    issueDate: now.toISOString().slice(0, 10),
    dueDate: nextWeek(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    customerEmail: "",
    customerWhatsapp: "",
    billingFrom: "B Socio Studio",
    billingAddress: "",
    discount: 0,
    tax: 0,
    paidAmount: 0,
    status: "Unpaid",
    notes: ""
  };
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState(null);
  const [packages, setPackages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(createInitialForm);
  const [lineItems, setLineItems] = useState([
    { description: "Monthly social media management", quantity: 1, rate: 0 }
  ]);

  useEffect(() => {
    Promise.all([fetch("/api/clients"), fetch("/api/packages")]).then(async ([clientRes, packageRes]) => {
      const [clientData, packageData] = await Promise.all([clientRes.json(), packageRes.json()]);
      setClients(clientData.clients || []);
      setPackages(packageData.packages || []);
    });
  }, []);

  useEffect(() => {
    if (!clients || form.clientId) return;
    const clientId = new URLSearchParams(window.location.search).get("clientId");
    if (!clientId) return;
    const client = clients.find((item) => item._id === clientId);
    if (!client) return;
    setForm((current) => ({
      ...current,
      clientId,
      customerEmail: client.email || "",
      customerWhatsapp: cleanPhone(client.whatsappNumber || client.phone || ""),
      billingAddress: client.location || current.billingAddress
    }));
    if (client.monthlyFee) {
      setLineItems([{ description: `${client.businessName} monthly marketing services`, quantity: 1, rate: Number(client.monthlyFee || 0) }]);
    }
  }, [clients, form.clientId]);

  const subtotal = useMemo(() => lineItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0), [lineItems]);
  const total = Math.max(subtotal - Number(form.discount || 0) + Number(form.tax || 0), 0);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));

    if (name === "clientId") {
      const client = clients.find((item) => item._id === value);
      if (client) {
        setForm((current) => ({
          ...current,
          clientId: value,
          customerEmail: client.email || "",
          customerWhatsapp: cleanPhone(client.whatsappNumber || client.phone || ""),
          billingAddress: client.location || current.billingAddress
        }));
        if (client.monthlyFee && lineItems.length === 1 && !Number(lineItems[0].rate || 0)) {
          setLineItems([{ description: `${client.businessName} monthly marketing services`, quantity: 1, rate: Number(client.monthlyFee || 0) }]);
        }
      }
    }

    if (name === "packageId") {
      const selectedPackage = packages.find((item) => item._id === value);
      if (selectedPackage) {
        setLineItems([
          {
            description: `${selectedPackage.name} package`,
            quantity: 1,
            rate: Number(selectedPackage.monthlyPrice || 0)
          }
        ]);
      }
    }
  }

  function updateItem(index, field, value) {
    setLineItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  function addItem() {
    setLineItems((current) => [...current, { description: "", quantity: 1, rate: 0 }]);
  }

  function removeItem(index) {
    setLineItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      lineItems: lineItems.map((item) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        rate: Number(item.rate || 0),
        amount: Number(item.quantity || 0) * Number(item.rate || 0)
      })),
      subtotal,
      amount: total
    };
    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error || "Invoice save failed.");
      return;
    }
    router.push(`/billing/${data.invoice._id}`);
  }

  if (!clients) return <Loading label="Loading invoice maker..." />;

  return (
    <div className="page-container">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Invoice maker</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Create Client Invoice</h1>
          <p className="mt-2 text-slate-500">Build an itemized invoice, save it, then print/download PDF and share it with the client.</p>
        </div>
        <Button href="/billing" variant="secondary">View Billing</Button>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
        <section className="grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Client
            <select name="clientId" value={form.clientId} onChange={updateForm} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" required>
              <option value="">Select Client</option>
              {clients.map((client) => <option key={client._id} value={client._id}>{client.businessName}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Package
            <select name="packageId" value={form.packageId} onChange={updateForm} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft">
              <option value="">Custom invoice</option>
              {packages.map((packageItem) => <option key={packageItem._id} value={packageItem._id}>{packageItem.name}</option>)}
            </select>
          </label>
          <FormInput label="Invoice Number" name="invoiceNumber" value={form.invoiceNumber} onChange={updateForm} required />
          <FormInput label="Issue Date" name="issueDate" type="date" value={form.issueDate} onChange={updateForm} required />
          <FormInput label="Due Date" name="dueDate" type="date" value={form.dueDate} onChange={updateForm} />
          <FormInput label="Status" name="status" value={form.status} onChange={updateForm} options={statusOptions} />
          <FormInput label="Month" name="month" type="number" value={form.month} onChange={updateForm} required />
          <FormInput label="Year" name="year" type="number" value={form.year} onChange={updateForm} required />
          <FormInput label="Customer Email" name="customerEmail" type="email" value={form.customerEmail} onChange={updateForm} />
          <FormInput label="Customer WhatsApp" name="customerWhatsapp" value={form.customerWhatsapp} onChange={updateForm} />
          <FormInput label="Billing From" name="billingFrom" value={form.billingFrom} onChange={updateForm} />
          <FormInput label="Client Address / Location" name="billingAddress" value={form.billingAddress} onChange={updateForm} />
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <h2 className="text-xl font-bold text-slate-950">Invoice items</h2>
            <Button type="button" variant="secondary" onClick={addItem}>Add Item</Button>
          </div>
          <div className="mt-5 grid gap-4">
            {lineItems.map((item, index) => (
              <div key={index} className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[1fr_110px_140px_120px_auto] md:items-end">
                <label className="block text-sm font-medium text-slate-700">
                  Description
                  <input value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" required />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Qty
                  <input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Rate
                  <input type="number" min="0" value={item.rate} onChange={(event) => updateItem(index, "rate", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" />
                </label>
                <div className="rounded-xl bg-white p-3 text-sm font-bold text-slate-950">
                  ₹{Number(item.quantity || 0) * Number(item.rate || 0)}
                </div>
                <Button type="button" variant="danger" onClick={() => removeItem(index)} disabled={lineItems.length === 1}>Remove</Button>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-2">
          <FormInput label="Discount" name="discount" type="number" value={form.discount} onChange={updateForm} />
          <FormInput label="Tax" name="tax" type="number" value={form.tax} onChange={updateForm} />
          <FormInput label="Paid Amount" name="paidAmount" type="number" value={form.paidAmount} onChange={updateForm} />
          <div className="rounded-2xl bg-slate-950 p-5 text-white">
            <p className="text-sm text-slate-300">Invoice Total</p>
            <p className="mt-2 text-3xl font-black">₹{total}</p>
            <p className="mt-2 text-sm text-slate-300">Subtotal ₹{subtotal} - Discount ₹{form.discount || 0} + Tax ₹{form.tax || 0}</p>
          </div>
          <FormInput className="md:col-span-2" label="Notes" name="notes" value={form.notes} onChange={updateForm} textarea placeholder="Payment terms, bank details, UPI ID, or client note" />
          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 md:col-span-2">{error}</p> : null}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save & Open Invoice"}</Button>
            <Button href="/billing" variant="secondary">Cancel</Button>
          </div>
        </section>
      </form>
    </div>
  );
}
