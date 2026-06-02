"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import FormInput from "@/components/FormInput";
import Loading from "@/components/Loading";

const platformSizes = ["Instagram Post", "Instagram Story", "Reel Cover", "Food Product Poster", "Festival Poster", "Offer Poster", "Website Banner", "WhatsApp Catalogue Cover"];
const styles = ["Premium", "Festive", "Minimal", "Realistic", "Luxury", "Local Market", "Modern Indian", "Clean Product Photo"];
const assetStatuses = ["Prompt Only", "Generated", "Downloaded", "Approved", "Rejected"];

export default function AiImageStudioPage() {
  const [clients, setClients] = useState(null);
  const [assets, setAssets] = useState(null);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");

  async function loadData() {
    const [clientRes, assetRes] = await Promise.all([fetch("/api/clients"), fetch("/api/ai-image")]);
    const [clientData, assetData] = await Promise.all([clientRes.json(), assetRes.json()]);
    setClients(clientData.clients || []);
    setAssets(assetData.assets || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/ai-image/generate-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Prompt generation failed.");
      return;
    }
    setResult(data.generated);
    loadData();
  }

  async function generateImage(assetId) {
    const response = await fetch("/api/ai-image/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId })
    });
    const data = await response.json();
    setMessage(data.error || "Image generation request sent.");
  }

  async function updateAsset(asset, status) {
    await fetch(`/api/ai-image/${asset._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    loadData();
  }

  async function deleteAsset(id) {
    await fetch(`/api/ai-image/${id}`, { method: "DELETE" });
    loadData();
  }

  if (!clients || !assets) return <Loading label="Loading AI Image Studio..." />;

  return (
    <div className="page-container">
      <h1 className="text-3xl font-black text-slate-950">AI Image Studio</h1>
      <p className="mt-2 text-slate-500">Generate professional poster prompts now, with backend structure ready for real OpenAI image generation later.</p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Client
          <select name="clientId" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" required>
            <option value="">Select Client</option>
            {clients.map((client) => <option key={client._id} value={client._id}>{client.businessName}</option>)}
          </select>
        </label>
        <FormInput label="Product/Service" name="productName" />
        <FormInput label="Platform Size" name="platformSize" options={platformSizes} required />
        <FormInput label="Style" name="style" options={styles} required />
        <FormInput label="Text to include" name="textToInclude" />
        <FormInput label="Offer" name="offer" />
        <FormInput label="CTA" name="cta" />
        <FormInput label="Aspect Ratio" name="aspectRatio" options={["1:1", "4:5", "9:16", "16:9"]} />
        <FormInput label="Language" name="language" options={["English", "Punjabi", "Hindi"]} />
        <FormInput label="Brand colors" name="brandColors" />
        <FormInput className="md:col-span-2" label="Notes" name="notes" textarea />
        <div className="md:col-span-2"><Button type="submit">Generate Prompt</Button></div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setMessage("Connect Image API later by adding OPENAI_API_KEY and enabling app/api/ai-image/generate-image/route.js.")}>Connect Image API</Button>
      </div>
      {message ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">{message}</p> : null}

      {result ? (
        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="card p-5"><h2 className="font-bold text-slate-950">Prompt</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{result.prompt}</p></div>
          <div className="card p-5"><h2 className="font-bold text-slate-950">Negative Prompt</h2><p className="mt-3 text-sm leading-6 text-slate-600">{result.negativePrompt}</p></div>
        </section>
      ) : null}

      <section className="mt-8 card p-5">
        <h2 className="text-xl font-bold text-slate-950">Saved Image Assets</h2>
        <div className="mt-4 grid gap-4">
          {assets.length ? assets.map((asset) => (
            <article key={asset._id} className="rounded-xl bg-slate-50 p-4">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="font-bold text-slate-950">{asset.clientId?.businessName} · {asset.productName || "Image prompt"}</p>
                  <p className="mt-1 text-sm text-slate-500">{asset.platformSize} · {asset.style} · {asset.status}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => generateImage(asset._id)}>Generate Image</Button>
                  {assetStatuses.map((status) => <Button key={status} variant="ghost" onClick={() => updateAsset(asset, status)}>{status}</Button>)}
                  <Button variant="danger" onClick={() => deleteAsset(asset._id)}>Delete</Button>
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{asset.prompt}</p>
            </article>
          )) : <EmptyState title="No image prompts yet" message="Generate your first prompt for a client poster." />}
        </div>
      </section>
    </div>
  );
}
