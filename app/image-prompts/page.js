"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import FormInput from "@/components/FormInput";
import Loading from "@/components/Loading";

const styles = ["Premium", "Festive", "Minimal", "Realistic", "Luxury", "Local Market", "Modern Indian"];
const platforms = ["Instagram Post", "Story", "Facebook Post", "Banner"];
const industries = ["Sweet Shop", "Restaurant", "Cafe", "Salon", "Boutique", "Gym", "Clinic", "Coaching Center", "Real Estate", "Automobile", "Grocery Store", "Other"];

export default function ImagePromptsPage() {
  const [clients, setClients] = useState(null);
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    fetch("/api/clients").then((res) => res.json()).then((data) => setClients(data.clients || []));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/image-prompts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    setPrompt(data.prompt);
  }

  if (!clients) return <Loading label="Loading prompt generator..." />;

  return (
    <div className="page-container">
      <h1 className="text-3xl font-black text-slate-950">Image Prompt Generator</h1>
      <p className="mt-2 text-slate-500">Create professional poster prompts for ChatGPT image generation, Midjourney, Leonardo, Ideogram, Canva AI, and similar tools.</p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Client
          <select name="clientId" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft">
            <option value="">No client selected</option>
            {clients.map((client) => <option key={client._id} value={client._id}>{client.businessName}</option>)}
          </select>
        </label>
        <FormInput label="Product Name" name="productName" />
        <FormInput label="Industry" name="industry" options={industries} />
        <FormInput label="Style" name="style" options={styles} />
        <FormInput label="Platform" name="platform" options={platforms} />
        <FormInput label="Text to include" name="textToInclude" />
        <FormInput label="Offer" name="offer" />
        <FormInput label="Colors" name="colors" />
        <FormInput className="md:col-span-2" label="Notes" name="notes" textarea />
        <div className="md:col-span-2">
          <Button type="submit">Generate Image Prompt</Button>
        </div>
      </form>

      {prompt ? (
        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {Object.entries(prompt).map(([key, value]) => (
            <div key={key} className="card p-5">
              <h2 className="text-lg font-bold capitalize text-slate-950">{key.replace(/([A-Z])/g, " $1")}</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{value}</p>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
