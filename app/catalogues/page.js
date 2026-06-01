"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import FormInput from "@/components/FormInput";
import Loading from "@/components/Loading";

const emptyForm = {
  clientId: "",
  type: "Menu",
  title: "",
  description: "",
  currency: "INR",
  status: "Draft",
  coverImageUrl: "",
  notes: ""
};

const typeOptions = ["Catalogue", "Menu", "Price List", "Service List"];
const statusOptions = ["Draft", "Published", "Archived"];
const currencyOptions = ["INR", "USD", "CAD", "GBP", "AUD"];

function parseItems(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", category = "", price = "0", description = ""] = line.split("|").map((part) => part.trim());
      return {
        name,
        category,
        price: Number(price || 0),
        description
      };
    })
    .filter((item) => item.name);
}

function formatMoney(value, currency) {
  const amount = Number(value || 0);
  if (!amount) return "Price not added";
  return `${currency || "INR"} ${amount}`;
}

function catalogueText(catalogue) {
  const lines = [
    `${catalogue.title}`,
    `${catalogue.type} for ${catalogue.clientId?.businessName || "Client"}`,
    catalogue.description,
    "",
    ...(catalogue.items || []).map((item, index) => `${index + 1}. ${item.name}${item.category ? ` - ${item.category}` : ""}${item.price ? ` - ${formatMoney(item.price, catalogue.currency)}` : ""}${item.description ? ` - ${item.description}` : ""}`),
    "",
    catalogue.notes ? `Notes: ${catalogue.notes}` : ""
  ];
  return lines.filter((line) => line !== undefined).join("\n").trim();
}

export default function CataloguesPage() {
  const [clients, setClients] = useState([]);
  const [catalogues, setCatalogues] = useState([]);
  const [meta, setMeta] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [itemsText, setItemsText] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get("clientId") || "";
    if (clientId) {
      setSelectedClientId(clientId);
      setForm((current) => ({ ...current, clientId }));
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const query = selectedClientId ? `?clientId=${selectedClientId}` : "";
    const [clientsRes, cataloguesRes] = await Promise.all([
      fetch("/api/clients"),
      fetch(`/api/catalogues${query}`)
    ]);
    const [clientsData, cataloguesData] = await Promise.all([clientsRes.json(), cataloguesRes.json()]);
    setClients(clientsData.clients || []);
    setCatalogues(cataloguesData.catalogues || []);
    setMeta(cataloguesData.meta || {});
    setLoading(false);
  }, [selectedClientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function updateForm(event) {
    const { name, value } = event.target;
    if (name === "clientId") setSelectedClientId(value);
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = {
      ...form,
      clientId: form.clientId,
      items: parseItems(itemsText)
    };
    const response = await fetch("/api/catalogues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Catalogue save failed.");
      setSaving(false);
      return;
    }
    setMessage("Catalogue/menu saved successfully.");
    setForm({ ...emptyForm, clientId: selectedClientId });
    setItemsText("");
    setSaving(false);
    loadData();
  }

  async function copyCatalogue(catalogue) {
    await navigator.clipboard.writeText(catalogueText(catalogue));
    setMessage("Catalogue copied. You can paste it into WhatsApp, Canva, or a client report.");
  }

  async function deleteCatalogue(id) {
    if (!confirm("Delete this catalogue permanently?")) return;
    const response = await fetch(`/api/catalogues/${id}`, { method: "DELETE" });
    const result = await response.json();
    setMessage(response.ok ? "Catalogue deleted." : result.error || "Delete failed.");
    loadData();
  }

  if (loading) return <Loading label="Loading catalogues..." />;

  return (
    <div className="page-container">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Client assets</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Catalogues & Menus</h1>
          <p className="mt-2 max-w-2xl text-slate-500">Create menus, product catalogues, price lists, and service lists for client content, WhatsApp sharing, and reports.</p>
        </div>
        <Button href="/clients/new" variant="secondary">Add Client</Button>
      </div>

      {message ? <p className="mt-5 rounded-xl bg-accent-soft p-3 text-sm font-semibold text-accent-dark">{message}</p> : null}

      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
        <label className="block text-sm font-bold text-slate-700">
          Filter by client
          <select
            value={selectedClientId}
            onChange={(event) => {
              setSelectedClientId(event.target.value);
              setForm((current) => ({ ...current, clientId: event.target.value }));
            }}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft md:max-w-sm"
          >
            <option value="">All clients</option>
            {clients.map((client) => <option key={client._id} value={client._id}>{client.businessName}</option>)}
          </select>
        </label>
      </section>

      {meta.canCreateCatalogues ? (
        <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-bold text-slate-950">Create catalogue or menu</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              <span>Client</span>
              <select
                name="clientId"
                value={form.clientId}
                onChange={updateForm}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
              >
                <option value="">Select Client</option>
                {clients.map((client) => <option key={client._id} value={client._id}>{client.businessName}</option>)}
              </select>
            </label>
            <FormInput label="Type" name="type" value={form.type} onChange={updateForm} options={typeOptions} required />
            <FormInput label="Title" name="title" value={form.title} onChange={updateForm} placeholder="Winter sweets menu" required />
            <FormInput label="Status" name="status" value={form.status} onChange={updateForm} options={statusOptions} />
            <FormInput label="Currency" name="currency" value={form.currency} onChange={updateForm} options={currencyOptions} />
            <FormInput label="Cover Image URL" name="coverImageUrl" value={form.coverImageUrl} onChange={updateForm} placeholder="Optional image link" />
            <FormInput label="Description" name="description" value={form.description} onChange={updateForm} textarea placeholder="Short intro for this catalogue/menu" className="md:col-span-2" />
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              Items
              <textarea
                value={itemsText}
                onChange={(event) => setItemsText(event.target.value)}
                rows={6}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent-soft"
                placeholder={"One item per line:\nSamosa | Snacks | 15 | Fresh crispy samosa\nRoasted Barfi | Sweets | 520 | Premium roasted barfi per kg"}
              />
            </label>
            <FormInput label="Notes" name="notes" value={form.notes} onChange={updateForm} textarea placeholder="Design instructions, seasonal notes, or availability" className="md:col-span-2" />
          </div>
          <div className="mt-5">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Catalogue"}</Button>
          </div>
        </form>
      ) : null}

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        {catalogues.length ? catalogues.map((catalogue) => (
          <article key={catalogue._id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">{catalogue.type} - {catalogue.status}</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">{catalogue.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{catalogue.clientId?.businessName || "Client"} - {catalogue.clientId?.industry || "Industry"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => copyCatalogue(catalogue)}>Copy</Button>
                {meta.canDeleteCatalogues ? <Button variant="danger" onClick={() => deleteCatalogue(catalogue._id)}>Delete</Button> : null}
              </div>
            </div>
            {catalogue.description ? <p className="mt-4 text-sm leading-6 text-slate-600">{catalogue.description}</p> : null}
            <div className="mt-5 grid gap-3">
              {catalogue.items?.length ? catalogue.items.map((item) => (
                <div key={item._id || item.name} className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <p className="font-bold text-slate-950">{item.name}</p>
                    <p className="font-bold text-accent">{formatMoney(item.price, catalogue.currency)}</p>
                  </div>
                  <p className="mt-1 text-slate-500">{item.category || "Uncategorised"}</p>
                  {item.description ? <p className="mt-2 text-slate-600">{item.description}</p> : null}
                </div>
              )) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No items added yet.</p>}
            </div>
            {catalogue.notes ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Notes: {catalogue.notes}</p> : null}
          </article>
        )) : (
          <div className="lg:col-span-2">
            <EmptyState title="No catalogues or menus yet" message="Create a client menu, price list, or product catalogue to reuse in content and client reports." />
          </div>
        )}
      </section>
    </div>
  );
}
