import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { canAccessClient } from "@/lib/access";
import { buildMonthlyReport } from "@/lib/reportGenerator";
import Analytics from "@/models/Analytics";
import Calendar from "@/models/Calendar";
import Client from "@/models/Client";
import Report from "@/models/Report";
import Task from "@/models/Task";

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    const { clientId, month, year } = await request.json();
    if (!clientId || !month || !year) {
      return NextResponse.json({ error: "Client, month, and year are required." }, { status: 400 });
    }
    if (!(await canAccessClient(auth.user, clientId))) {
      return NextResponse.json({ error: "Client not accessible." }, { status: 403 });
    }
    const client = await Client.findById(clientId);
    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

    const [analytics, calendar, tasks] = await Promise.all([
      Analytics.find({ userId: auth.user._id, clientId }).lean(),
      Calendar.find({ userId: auth.user._id, clientId }).lean(),
      Task.find({ userId: auth.user._id, clientId }).lean()
    ]);

    const generated = buildMonthlyReport({ client, month, year, analytics, calendar, tasks });
    const report = await Report.findOneAndUpdate(
      { userId: auth.user._id, clientId, month, year },
      { userId: auth.user._id, clientId, month, year, ...generated },
      { new: true, upsert: true, runValidators: true }
    ).populate("clientId", "businessName industry");

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Report generation failed." }, { status: 500 });
  }
}
