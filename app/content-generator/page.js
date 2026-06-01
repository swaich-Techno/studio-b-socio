"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import FormInput from "@/components/FormInput";
import Loading from "@/components/Loading";

const platforms = ["Instagram", "Facebook", "YouTube Shorts", "WhatsApp Status"];
const contentTypes = ["Post", "Reel", "Story", "Carousel", "Offer Poster"];
const goals = ["Awareness", "Sales", "Engagement", "Festival", "Product Promotion"];
const tones = ["Professional", "Friendly", "Premium", "Funny", "Local Punjabi/Hindi", "Festive"];
const languages = ["English", "Punjabi", "Hindi", "Hinglish"];

export default function ContentGeneratorPage() {
  const [clients, setClients] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/clients").then((res) => res.json()).then((data) => setClients(data.clients || []));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/content/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Generation failed.");
      return;
    }
    setResult(data.generated);
  }

  if (!clients) return <Loading label="Loading generator..." />;

  return (
    <div className="page-container">
      <h1 className="text-3xl font-black text-slate-950">Content Generator</h1>
      <p className="mt-2 text-slate-500">Rule-based ideas, captions, hashtags, reels, stories, prompts, and CTAs using client context.</p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Client
          <select name="clientId" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" required>
            <option value="">Select Client</option>
            {clients.map((client) => <option key={client._id} value={client._id}>{client.businessName}</option>)}
          </select>
        </label>
        <FormInput label="Platform" name="platform" options={platforms} required />
        <FormInput label="Content Type" name="contentType" options={contentTypes} required />
        <FormInput label="Goal" name="goal" options={goals} required />
        <FormInput label="Tone" name="tone" options={tones} required />
        <FormInput label="Language" name="language" options={languages} required />
        <FormInput label="Product/Service Name" name="productName" />
        <FormInput label="Offer Details" name="offerDetails" />
        <FormInput className="md:col-span-2" label="Extra Notes" name="extraNotes" textarea />
        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 md:col-span-2">{error}</p> : null}
        <div className="md:col-span-2">
          <Button type="submit" disabled={loading}>{loading ? "Generating..." : "Generate Content"}</Button>
        </div>
      </form>

      {result ? (
        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {Object.entries({
            "5 Post Ideas": result.ideas,
            "5 Captions": result.captions,
            "15 Hashtags": result.hashtags,
            "3 Reel Ideas": result.reelIdeas,
            "3 Story Ideas": result.storyIdeas,
            "3 Poster/Image Prompts": result.posterPrompts,
            "Monthly Content Calendar": (result.monthlyCalendar || []).map((item) => `${item.week}: ${item.topic} (${item.platform} ${item.contentType})`),
            "Ad Copy": result.adCopy || [],
            "WhatsApp Messages": result.whatsappMessages || [],
            "Google Review Requests": result.googleReviewRequests || [],
            "CTA Suggestions": result.ctas
          }).map(([title, items]) => (
            <div key={title} className="card p-5">
              <h2 className="text-lg font-bold text-slate-950">{title}</h2>
              <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
                {items.map((item) => <li key={item} className="rounded-xl bg-slate-50 p-3">{item}</li>)}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
