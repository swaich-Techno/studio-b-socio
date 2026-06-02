"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import FormInput from "@/components/FormInput";
import Loading from "@/components/Loading";

const goals = ["Awareness", "Sales", "Engagement", "Festival", "Offer", "Product Launch"];
const durations = ["7 sec", "15 sec", "30 sec", "45 sec"];
const tones = ["Funny", "Premium", "Local", "Emotional", "Festive", "Informative"];
const languages = ["English", "Hindi", "Punjabi", "Hinglish"];
const statuses = ["Idea", "Script Ready", "Shooting", "Editing", "Review", "Approved", "Posted"];

export default function ReelStudioPage() {
  const [clients, setClients] = useState(null);
  const [team, setTeam] = useState([]);
  const [reels, setReels] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [generated, setGenerated] = useState(null);
  const [message, setMessage] = useState("");

  async function loadData() {
    const [clientRes, teamRes, reelRes] = await Promise.all([fetch("/api/clients"), fetch("/api/team"), fetch("/api/reels")]);
    const [clientData, teamData, reelData] = await Promise.all([clientRes.json(), teamRes.json(), reelRes.json()]);
    setClients(clientData.clients || []);
    setTeam(teamData.team || []);
    setReels(reelData.reels || []);
    const clientId = new URLSearchParams(window.location.search).get("clientId");
    if (clientId) setSelectedClientId(clientId);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/reels/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    setGenerated(data.generated || null);
    loadData();
  }

  async function updateReel(reel, status) {
    await fetch(`/api/reels/${reel._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    loadData();
  }

  async function deleteReel(id) {
    await fetch(`/api/reels/${id}`, { method: "DELETE" });
    loadData();
  }

  if (!clients || !reels) return <Loading label="Loading Reel Studio..." />;

  return (
    <div className="page-container">
      <h1 className="text-3xl font-black text-slate-950">Reel Studio</h1>
      <p className="mt-2 text-slate-500">Generate hooks, scripts, scenes, captions, editing notes, music suggestions, and covers.</p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Client
          <select name="clientId" value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" required>
            <option value="">Select Client</option>
            {clients.map((client) => <option key={client._id} value={client._id}>{client.businessName}</option>)}
          </select>
        </label>
        <FormInput label="Product/Service" name="productName" />
        <FormInput label="Goal" name="goal" options={goals} required />
        <FormInput label="Reel Duration" name="duration" options={durations} required />
        <FormInput label="Tone" name="tone" options={tones} required />
        <FormInput label="Language" name="language" options={languages} required />
        <label className="block text-sm font-medium text-slate-700">
          Assigned To
          <select name="assignedTo" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft">
            <option value="">Unassigned</option>
            {team.map((member) => <option key={member._id} value={member.name}>{member.name}</option>)}
          </select>
        </label>
        <FormInput className="md:col-span-2" label="Notes" name="notes" textarea />
        <div className="md:col-span-2"><Button type="submit">Generate Reel Plan</Button></div>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setMessage("Connect Reel API later by adding RUNWAY_API_KEY and sending the generated shot list to a video API.")}>Connect Reel API</Button>
      </div>
      {message ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">{message}</p> : null}

      {generated ? (
        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {Object.entries({
            Hook: generated.hook,
            Script: generated.script,
            "Scene-by-scene shot list": generated.scenes,
            "On-screen text": generated.onScreenText,
            Voiceover: generated.voiceover,
            Caption: generated.caption,
            Hashtags: generated.hashtags,
            "Editing instructions": generated.editingInstructions,
            "Music/trend suggestion": generated.musicSuggestion,
            "Cover image prompt": generated.coverPrompt
          }).map(([title, value]) => (
            <div key={title} className="card p-5">
              <h2 className="font-bold text-slate-950">{title}</h2>
              {Array.isArray(value) ? (
                <ul className="mt-3 grid gap-2 text-sm text-slate-600">{value.map((item) => <li key={item} className="rounded-xl bg-slate-50 p-3">{item}</li>)}</ul>
              ) : <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{value}</p>}
            </div>
          ))}
        </section>
      ) : null}

      <section className="mt-8 card p-5">
        <h2 className="text-xl font-bold text-slate-950">Saved Reels</h2>
        <div className="mt-4 grid gap-4">
          {reels.length ? reels.map((reel) => (
            <article key={reel._id} className="rounded-xl bg-slate-50 p-4">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="font-bold text-slate-950">{reel.clientId?.businessName} · {reel.productName || "Reel idea"}</p>
                  <p className="mt-1 text-sm text-slate-500">{reel.goal} · {reel.duration} · {reel.status} · {reel.assignedTo || "Unassigned"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((status) => <Button key={status} variant="ghost" onClick={() => updateReel(reel, status)}>{status}</Button>)}
                  <Button variant="danger" onClick={() => deleteReel(reel._id)}>Delete</Button>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{reel.hook}</p>
            </article>
          )) : <EmptyState title="No reels yet" message="Generate your first reel script for a client." />}
        </div>
      </section>
    </div>
  );
}
