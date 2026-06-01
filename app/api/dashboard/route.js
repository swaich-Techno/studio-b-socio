import { NextResponse } from "next/server";
import { isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { accessibleClientIds } from "@/lib/access";
import Analytics from "@/models/Analytics";
import Calendar from "@/models/Calendar";
import Client from "@/models/Client";
import ClientApproval from "@/models/ClientApproval";
import Content from "@/models/Content";
import Invoice from "@/models/Invoice";
import Reel from "@/models/Reel";
import Task from "@/models/Task";
import User from "@/models/User";

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "week";
  const assignedTo = searchParams.get("assignedTo") || "";

  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + (range === "month" ? 30 : 7));
  const clientIds = await accessibleClientIds(auth.user);
  const teamQuery = isOwnerAdmin(auth.user) ? { agencyName: auth.user.agencyName, status: "approved" } : { _id: auth.user._id };

  const monthStart = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), 1);
  const monthEnd = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth() + 1, 0, 23, 59, 59);

  const taskQuery = { clientId: { $in: clientIds }, status: { $ne: "Completed" } };
  if (assignedTo) taskQuery.assignedTo = assignedTo;

  const [totalClients, activeClients, totalPostsPlanned, pendingTasks, completedTasks, calendarPendingApprovals, clientPendingApprovals, postsScheduledThisWeek, reelsInEditing, openInvoices, monthInvoices, monthAnalytics, upcoming, recentContent, latestAnalytics, team, leadClients, upcomingRenewals, clientFinancials] = await Promise.all([
    Client.countDocuments({ _id: { $in: clientIds } }),
    Client.countDocuments({ _id: { $in: clientIds }, status: "Active" }),
    Calendar.countDocuments({ clientId: { $in: clientIds } }),
    Task.countDocuments(taskQuery),
    Task.countDocuments({ clientId: { $in: clientIds }, status: "Completed" }),
    Calendar.countDocuments({ clientId: { $in: clientIds }, approvalStatus: { $in: ["Need Owner Approval", "Sent to Client", "Client Revision"] } }),
    ClientApproval.countDocuments({ clientId: { $in: clientIds }, status: "Waiting Client Approval" }),
    Calendar.countDocuments({ clientId: { $in: clientIds }, postDate: { $gte: startOfWeek, $lte: endOfWeek } }),
    Reel.countDocuments({ clientId: { $in: clientIds }, status: { $in: ["Editing", "Review"] } }),
    isOwnerAdmin(auth.user) ? Invoice.find({ clientId: { $in: clientIds }, status: { $nin: ["Paid", "Cancelled"] } }).lean() : [],
    isOwnerAdmin(auth.user) ? Invoice.find({ clientId: { $in: clientIds }, createdAt: { $gte: monthStart, $lte: monthEnd } }).lean() : [],
    Analytics.find({ clientId: { $in: clientIds }, date: { $gte: monthStart, $lte: monthEnd } }).lean(),
    Calendar.find({ clientId: { $in: clientIds }, postDate: { $gte: new Date() } }).populate("clientId", "businessName").sort({ postDate: 1 }).limit(5).lean(),
    Content.find({ clientId: { $in: clientIds } }).populate("clientId", "businessName").sort({ createdAt: -1 }).limit(4).lean(),
    Analytics.find({ clientId: { $in: clientIds } }).populate("clientId", "businessName").sort({ createdAt: -1 }).limit(4).lean(),
    User.find(teamQuery).select("-password").lean(),
    Client.countDocuments({ _id: { $in: clientIds }, status: "Lead" }),
    Client.find({ _id: { $in: clientIds }, renewalDate: { $gte: new Date(), $lte: endOfWeek } }).select("businessName renewalDate").sort({ renewalDate: 1 }).limit(5).lean(),
    isOwnerAdmin(auth.user) ? Client.find({ _id: { $in: clientIds } }).select("balancePending monthlyFee advancePaid businessName").lean() : []
  ]);

  const clientBalanceTotal = clientFinancials.reduce((sum, client) => sum + Number(client.balancePending || 0), 0);
  const invoiceBalanceTotal = openInvoices.reduce((sum, invoice) => {
    const balance = Number(invoice.amount || 0) - Number(invoice.paidAmount || 0);
    return sum + Math.max(balance, 0);
  }, 0);
  const outstandingBalance = Math.max(clientBalanceTotal, invoiceBalanceTotal);

  return NextResponse.json({
    stats: {
      totalClients,
      activeClients,
      totalPostsPlanned,
      pendingTasks,
      completedTasks,
      pendingApprovals: calendarPendingApprovals + clientPendingApprovals,
      postsScheduledThisWeek,
      reelsInEditing,
      unpaidInvoices: openInvoices.length,
      thisMonthRevenue: monthInvoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0),
      pendingPayments: outstandingBalance,
      outstandingBalance,
      clientBalanceTotal,
      invoiceBalanceTotal,
      leadsGenerated: monthAnalytics.reduce((sum, item) => sum + Number(item.leads || 0), 0)
    },
    filters: { range, assignedTo },
    onboarding: {
      hasClients: totalClients > 0,
      hasTeam: team.length > 1,
      hasContent: totalPostsPlanned > 0,
      hasAnalytics: latestAnalytics.length > 0,
      hasLeadPipeline: leadClients > 0
    },
    upcomingRenewals,
    upcoming,
    teamWorkload: team.map((member) => ({
      name: member.name,
      role: member.role,
      assignedClients: member.assignedClients?.length || 0
    })),
    recentAnalytics: latestAnalytics,
    activity: [
      ...recentContent.map((item) => ({ type: "Content", label: item.clientId?.businessName || "Client", detail: `${item.platform} ${item.contentType} generated`, date: item.createdAt })),
      ...latestAnalytics.map((item) => ({ type: "Analytics", label: item.clientId?.businessName || "Client", detail: `${item.platform} reach ${item.reach}`, date: item.createdAt }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6)
  });
}
