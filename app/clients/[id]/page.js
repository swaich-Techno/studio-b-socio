"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import Loading from "@/components/Loading";

function ListBlock({ title, items, render }) {
  return (
    <section className="card p-5">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.length ? items.map(render) : <p className="text-sm text-slate-500">Nothing added yet.</p>}
      </div>
    </section>
  );
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [data, setData] = useState({ content: [], tasks: [], analytics: [], reports: [], calendar: [], catalogues: [] });
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState(null);
  const [message, setMessage] = useState("");

  const loadAll = useCallback(async function loadAll() {
    const [clientRes, contentRes, tasksRes, analyticsRes, reportsRes, calendarRes, fileRes, catalogueRes] = await Promise.all([
      fetch(`/api/clients/${id}`),
      fetch(`/api/content?clientId=${id}`),
      fetch(`/api/tasks?clientId=${id}`),
      fetch(`/api/analytics?clientId=${id}`),
      fetch(`/api/reports?clientId=${id}`),
      fetch(`/api/calendar?clientId=${id}`),
      fetch(`/api/files?clientId=${id}`),
      fetch(`/api/catalogues?clientId=${id}`)
    ]);
    const [clientData, contentData, tasksData, analyticsData, reportsData, calendarData, fileData, catalogueData] = await Promise.all([
      clientRes.json(),
      contentRes.json(),
      tasksRes.json(),
      analyticsRes.json(),
      reportsRes.json(),
      calendarRes.json(),
      fileRes.json(),
      catalogueRes.json()
    ]);
    setClient(clientData.client);
    setData({
      content: contentData.content || [],
      tasks: tasksData.tasks || [],
      analytics: analyticsData.analytics || [],
      reports: reportsData.reports || [],
      calendar: calendarData.calendar || [],
      catalogues: catalogueData.catalogues || []
    });
    setFiles(fileData.files || []);
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function generateContent(contentType = "Post") {
    setMessage("Generating content...");
    await fetch("/api/content/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: id,
        platform: "Instagram",
        contentType,
        goal: contentType === "Reel" ? "Engagement" : "Awareness",
        tone: "Friendly",
        language: "Hinglish",
        productName: client.mainProducts || client.industry,
        offerDetails: "",
        extraNotes: client.notes
      })
    });
    setMessage("Generated and saved.");
    loadAll();
  }

  async function generateMonthlyPlan() {
    setMessage("Generating monthly plan...");
    const response = await fetch("/api/content/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: id,
        platform: "Instagram",
        contentType: "Post",
        goal: "Awareness",
        tone: "Friendly",
        language: "Hinglish",
        productName: client.mainProducts || client.industry,
        offerDetails: "",
        extraNotes: client.notes
      })
    });
    const result = await response.json();
    const generated = result.generated;
    if (!generated) {
      setMessage("Could not generate monthly plan.");
      return;
    }
    const today = new Date();
    await Promise.all(generated.ideas.map((idea, index) => {
      const date = new Date(today.getFullYear(), today.getMonth(), Math.min(today.getDate() + index * 4, 28));
      return fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: id,
          date: date.toISOString().slice(0, 10),
          platform: "Instagram",
          contentType: index % 2 === 0 ? "Post" : "Reel",
          topic: idea.replace(/^\d+\.\s*/, ""),
          caption: generated.captions[index] || "",
          hashtags: generated.hashtags.join(" "),
          status: "Idea",
          assignedTo: index % 2 === 0 ? "Aman" : "Lovejot",
          notes: "Auto-created from Generate Monthly Plan."
        })
      });
    }));
    setMessage("Monthly plan generated and added to the content calendar.");
    loadAll();
  }

  async function generatePosterPrompt() {
    const response = await fetch("/api/image-prompts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: id,
        productName: client.mainProducts || client.industry,
        industry: client.industry,
        style: "Premium",
        platform: "Instagram Post",
        textToInclude: client.businessName,
        colors: client.brandColors,
        notes: client.notes
      })
    });
    const result = await response.json();
    setPrompt(result.prompt);
  }

  async function createReport() {
    const now = new Date();
    const response = await fetch("/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: id, month: now.getMonth() + 1, year: now.getFullYear() })
    });
    setMessage(response.ok ? "Report generated for this month." : "Could not generate report yet.");
    loadAll();
  }

  async function uploadDocument(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage("Uploading document...");
    const fileData = await readFileAsBase64(file);
    const response = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: id,
        module: "client",
        category: "Client document",
        name: file.name,
        mimeType: file.type,
        size: file.size,
        data: fileData
      })
    });
    setMessage(response.ok ? "Document uploaded." : "Could not upload document. Keep files under 2MB.");
    event.target.value = "";
    loadAll();
  }

  if (!client) return <Loading label="Loading client profile..." />;

  const usedThisMonth = {
    posts: data.calendar.filter((item) => item.contentType === "Post" || item.contentType === "Carousel").length,
    reels: data.calendar.filter((item) => item.contentType === "Reel").length,
    stories: data.calendar.filter((item) => item.contentType === "Story").length
  };

  return (
    <div className="page-container">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-black text-slate-950">{client.businessName}</h1>
          <p className="mt-2 text-slate-500">{client.industry} - {client.location || "Location not added"} - {client.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={generateMonthlyPlan}>Generate Monthly Plan</Button>
          <Button onClick={() => generateContent("Post")} variant="secondary">Generate Caption</Button>
          <Button onClick={generatePosterPrompt} variant="secondary">Generate Poster Prompt</Button>
          <Button href={`/reel-studio?clientId=${id}`} variant="secondary">Reel Script</Button>
          <Button href={`/catalogues?clientId=${id}`} variant="secondary">Create Catalogue/Menu</Button>
          <Button href={`/chat?clientId=${id}`} variant="secondary">Client Chat</Button>
          <Button href={`/billing/new?clientId=${id}`} variant="secondary">Create Invoice</Button>
          <Button href={`/analytics?clientId=${id}`} variant="secondary">Add Analytics</Button>
          <Button onClick={createReport} variant="secondary">Create Report</Button>
        </div>
      </div>

      {message ? <p className="mt-4 rounded-xl bg-accent-soft p-3 text-sm font-semibold text-accent-dark">{message}</p> : null}

      <section className="mt-8 grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-2">
        <div>
          <h2 className="font-bold text-slate-950">Client profile</h2>
          <p className="mt-2 text-sm text-slate-600">Contact: {client.contactPerson || "Not added"} - {client.phone || "No phone"}</p>
          <p className="mt-1 text-sm text-slate-600">Instagram: {client.instagramHandle || "Not added"} - Facebook: {client.facebookPage || "Not added"}</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-950">Brand details</h2>
          <p className="mt-2 text-sm text-slate-600">Colors: {client.brandColors || "Not added"}</p>
          <p className="mt-1 text-sm text-slate-600">Audience: {client.targetAudience || "Not added"}</p>
          <p className="mt-1 text-sm text-slate-600">Products: {client.mainProducts || "Not added"}</p>
        </div>
      </section>

      <section className="mt-6 grid gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft md:grid-cols-4">
        {[
          ["Pipeline", client.status || client.pipelineStatus],
          ["Monthly fee", `₹${client.monthlyFee || 0}`],
          ["Balance", `₹${client.balancePending || 0}`],
          ["Renewal", client.renewalDate ? new Date(client.renewalDate).toLocaleDateString() : "Not added"]
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
            <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-bold text-slate-950">Package Usage</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ["Posts", usedThisMonth.posts, client.postsPerMonth],
            ["Reels", usedThisMonth.reels, client.reelsPerMonth],
            ["Stories", usedThisMonth.stories, client.storiesPerMonth]
          ].map(([label, used, limit]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-950">{label}</p>
              <p className="mt-1 text-sm text-slate-500">{used} used / {limit || "No limit"} planned monthly</p>
              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-accent" style={{ width: limit ? `${Math.min((used / limit) * 100, 100)}%` : "0%" }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Client Documents</h2>
            <p className="mt-1 text-sm text-slate-500">Upload brand guidelines, logos, menus, price lists, client photos, and contracts.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark">
            Upload File
            <input type="file" className="hidden" onChange={uploadDocument} />
          </label>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {files.length ? files.map((file) => (
            <a key={file._id} href={`/api/files/${file._id}`} target="_blank" className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm hover:bg-slate-100">
              <p className="font-bold text-slate-950">{file.name}</p>
              <p className="mt-1 text-slate-500">{file.category || file.module} - {Math.round((file.size || 0) / 1024)} KB</p>
            </a>
          )) : <p className="text-sm text-slate-500">No documents uploaded yet.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Brand Brain</h2>
            <p className="mt-1 text-sm text-slate-500">Used by content, image prompts, reels, and reports.</p>
          </div>
          <Button href={`/clients/new?id=${client._id}`} variant="secondary">Edit Brand Brain</Button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            ["Tone", client.brandBrain?.brandTone],
            ["Preferred language", client.brandBrain?.preferredLanguage],
            ["Main audience", client.brandBrain?.mainAudience],
            ["Best sellers", client.brandBrain?.bestSellingProducts],
            ["Competitors", client.brandBrain?.competitors],
            ["Design preferences", client.brandBrain?.designPreferences]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{value || "Not added"}</p>
            </div>
          ))}
        </div>
      </section>

      {prompt ? (
        <section className="mt-6 card p-5">
          <h2 className="text-xl font-bold text-slate-950">Generated Poster Prompt</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{prompt.prompt}</p>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ListBlock title="Content ideas & captions" items={data.content} render={(item) => (
          <div key={item._id} className="rounded-xl bg-slate-50 p-4 text-sm">
            <p className="font-bold text-slate-900">{item.platform} - {item.contentType}</p>
            <p className="mt-1 text-slate-600">{item.ideas?.[0] || item.captions?.[0]}</p>
          </div>
        )} />
        <ListBlock title="Tasks" items={data.tasks} render={(item) => (
          <div key={item._id} className="rounded-xl bg-slate-50 p-4 text-sm">
            <p className="font-bold text-slate-900">{item.title}</p>
            <p className="mt-1 text-slate-600">{item.assignedTo} - {item.status} - {new Date(item.dueDate).toLocaleDateString()}</p>
          </div>
        )} />
        <ListBlock title="Analytics" items={data.analytics} render={(item) => (
          <div key={item._id} className="rounded-xl bg-slate-50 p-4 text-sm">
            <p className="font-bold text-slate-900">{item.platform} - {new Date(item.date).toLocaleDateString()}</p>
            <p className="mt-1 text-slate-600">Reach {item.reach} - Leads {item.leads} - Followers {item.followers}</p>
          </div>
        )} />
        <ListBlock title="Reports" items={data.reports} render={(item) => (
          <div key={item._id} className="rounded-xl bg-slate-50 p-4 text-sm">
            <p className="font-bold text-slate-900">{item.month}/{item.year}</p>
            <p className="mt-1 text-slate-600">{item.summary}</p>
          </div>
        )} />
        <ListBlock title="Catalogues & menus" items={data.catalogues} render={(item) => (
          <div key={item._id} className="rounded-xl bg-slate-50 p-4 text-sm">
            <p className="font-bold text-slate-900">{item.title}</p>
            <p className="mt-1 text-slate-600">{item.type} - {item.status} - {item.items?.length || 0} items</p>
          </div>
        )} />
        <ListBlock title="Calendar" items={data.calendar} render={(item) => (
          <div key={item._id} className="rounded-xl bg-slate-50 p-4 text-sm">
            <p className="font-bold text-slate-900">{item.topic}</p>
            <p className="mt-1 text-slate-600">{item.platform} - {item.status} - {new Date(item.date).toLocaleDateString()}</p>
          </div>
        )} />
        {!data.content.length && !data.tasks.length && !data.analytics.length && !data.catalogues.length ? (
          <EmptyState title="Start this client workspace" message="Generate content, add analytics, create tasks, and build reports from the buttons above." />
        ) : null}
      </div>
    </div>
  );
}
