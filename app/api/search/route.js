import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { accessibleClientIds } from "@/lib/access";
import Client from "@/models/Client";
import Catalogue from "@/models/Catalogue";
import Content from "@/models/Content";
import Report from "@/models/Report";
import Task from "@/models/Task";

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ results: [] });

  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const clientIds = await accessibleClientIds(auth.user);

  const [clients, tasks, reports, content, catalogues] = await Promise.all([
    Client.find({ _id: { $in: clientIds }, $or: [{ businessName: regex }, { industry: regex }, { location: regex }, { mainProducts: regex }] }).limit(8).lean(),
    Task.find({ clientId: { $in: clientIds }, $or: [{ title: regex }, { description: regex }, { notes: regex }, { assignedTo: regex }] }).populate("clientId", "businessName").limit(8).lean(),
    Report.find({ clientId: { $in: clientIds }, $or: [{ summary: regex }, { completedWork: regex }, { analyticsSummary: regex }, { bestContent: regex }, { nextMonthSuggestions: regex }] }).populate("clientId", "businessName").limit(8).lean(),
    Content.find({ clientId: { $in: clientIds }, $or: [{ productName: regex }, { ideas: regex }, { captions: regex }, { hashtags: regex }] }).populate("clientId", "businessName").limit(8).lean(),
    Catalogue.find({ clientId: { $in: clientIds }, $or: [{ title: regex }, { description: regex }, { "items.name": regex }, { "items.category": regex }] }).populate("clientId", "businessName").limit(8).lean()
  ]);

  const results = [
    ...clients.map((item) => ({ type: "Client", title: item.businessName, subtitle: `${item.industry} - ${item.location || "No location"}`, href: `/clients/${item._id}` })),
    ...tasks.map((item) => ({ type: "Task", title: item.title, subtitle: `${item.clientId?.businessName || "Client"} - ${item.status}`, href: "/tasks" })),
    ...reports.map((item) => ({ type: "Report", title: item.clientId?.businessName || "Client report", subtitle: `${item.month}/${item.year}`, href: "/reports" })),
    ...content.map((item) => ({ type: "Content", title: item.productName || item.contentType, subtitle: `${item.clientId?.businessName || "Client"} - ${item.platform}`, href: "/content-generator" })),
    ...catalogues.map((item) => ({ type: "Catalogue", title: item.title, subtitle: `${item.clientId?.businessName || "Client"} - ${item.type}`, href: "/catalogues" }))
  ];

  return NextResponse.json({ results });
}
