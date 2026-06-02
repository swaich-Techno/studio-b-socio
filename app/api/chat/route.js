import { NextResponse } from "next/server";
import { accessibleClientIds, canAccessClient } from "@/lib/access";
import { requireApiUser } from "@/lib/auth";
import { publicChatSender, publicTeamMember } from "@/lib/teamPrivacy";
import ChatChannel from "@/models/ChatChannel";
import ChatMessage from "@/models/ChatMessage";
import Client from "@/models/Client";
import User from "@/models/User";

function slugify(value) {
  return String(value || "team").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "team";
}

async function ensureDefaultChannel(user) {
  const existing = await ChatChannel.findOne({ agencyName: user.agencyName, slug: "team" });
  if (existing) return existing;
  return ChatChannel.create({
    agencyName: user.agencyName,
    name: "Agency Team",
    slug: "team",
    topic: "Main internal team channel",
    createdBy: user._id,
    isDefault: true
  });
}

async function ensureClientChannel(user, clientId) {
  if (!(await canAccessClient(user, clientId))) {
    return { error: NextResponse.json({ error: "Client not accessible." }, { status: 403 }) };
  }

  const client = await Client.findById(clientId).select("businessName industry").lean();
  if (!client) {
    return { error: NextResponse.json({ error: "Client not found." }, { status: 404 }) };
  }

  const slug = `client-${client._id}`;
  const existing = await ChatChannel.findOne({ agencyName: user.agencyName, slug });
  if (existing) return { channel: existing };

  const channel = await ChatChannel.create({
    agencyName: user.agencyName,
    name: client.businessName,
    slug,
    topic: `Client workspace chat for ${client.businessName}`,
    clientId: client._id,
    createdBy: user._id
  });

  return { channel };
}

async function validateRoomAccess(user, room) {
  if (room === "team") return true;
  const channel = await ChatChannel.findOne({ agencyName: user.agencyName, slug: room }).lean();
  if (!channel) return false;
  if (!channel.clientId) return true;
  return canAccessClient(user, channel.clientId);
}

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const room = searchParams.get("room") || "team";
  const limit = Math.min(Number(searchParams.get("limit") || 80), 120);
  await ensureDefaultChannel(auth.user);
  if (!(await validateRoomAccess(auth.user, room))) {
    return NextResponse.json({ error: "Chat room not accessible." }, { status: 403 });
  }

  const clientIds = await accessibleClientIds(auth.user);

  await ChatMessage.updateMany(
    { agencyName: auth.user.agencyName, room },
    { $addToSet: { readBy: auth.user._id } }
  );

  const [messages, members, channels, clients] = await Promise.all([
    ChatMessage.find({ agencyName: auth.user.agencyName, room })
      .populate("senderId", "name role chatStatus status")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    User.find({ agencyName: auth.user.agencyName, status: "approved" })
      .select("name role status skills assignedClients chatStatus")
      .sort({ name: 1 })
      .lean(),
    ChatChannel.find({
      agencyName: auth.user.agencyName,
      $or: [{ clientId: { $exists: false } }, { clientId: null }, { clientId: { $in: clientIds } }]
    }).populate("clientId", "businessName industry status").sort({ isDefault: -1, name: 1 }).lean(),
    Client.find({ _id: { $in: clientIds } }).select("businessName industry status").sort({ businessName: 1 }).lean()
  ]);

  return NextResponse.json({
    channels,
    clients,
    messages: messages.reverse().map((item) => ({
      _id: item._id.toString(),
      message: item.message,
      room: item.room,
      sender: publicChatSender(item.senderId),
      isMine: item.senderId?._id?.toString?.() === auth.user._id.toString(),
      attachments: item.attachments || [],
      pinned: Boolean(item.pinned),
      readCount: item.readBy?.length || 0,
      createdAt: item.createdAt
    })),
    members: members.map((member) => ({
      _id: member._id.toString(),
      name: member.name || "Team member",
      role: member.role || "Team",
      status: member.status || "approved",
      skills: member.skills || [],
      assignedClients: member.assignedClients || [],
      chatStatus: member.chatStatus || "Available"
    })),
    currentUser: {
      _id: auth.user._id.toString(),
      chatStatus: auth.user.chatStatus || "Available"
    }
  });
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    if (body.type === "channel") {
      const name = String(body.name || "").trim();
      if (!name) return NextResponse.json({ error: "Channel name is required." }, { status: 400 });
      if (body.clientId) {
        if (!(await canAccessClient(auth.user, body.clientId))) {
          return NextResponse.json({ error: "Client not accessible." }, { status: 403 });
        }
      }
      const slug = slugify(name);
      const existing = await ChatChannel.findOne({ agencyName: auth.user.agencyName, slug });
      if (existing) return NextResponse.json({ channel: existing });
      const channel = await ChatChannel.create({
        agencyName: auth.user.agencyName,
        name,
        slug,
        topic: body.topic || "",
        clientId: body.clientId || undefined,
        createdBy: auth.user._id
      });
      return NextResponse.json({ channel }, { status: 201 });
    }

    if (body.type === "client-channel") {
      const result = await ensureClientChannel(auth.user, body.clientId);
      if (result.error) return result.error;
      return NextResponse.json({ channel: result.channel }, { status: result.channel?.createdAt ? 201 : 200 });
    }

    const message = String(body.message || "").trim();
    const room = body.room || "team";
    const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 4) : [];

    if (!message && !attachments.length) {
      return NextResponse.json({ error: "Message or attachment is required." }, { status: 400 });
    }

    if (message.length > 1200) {
      return NextResponse.json({ error: "Message is too long. Keep it under 1200 characters." }, { status: 400 });
    }

    if (!(await validateRoomAccess(auth.user, room))) {
      return NextResponse.json({ error: "Chat room not accessible." }, { status: 403 });
    }

    const saved = await ChatMessage.create({
      agencyName: auth.user.agencyName,
      senderId: auth.user._id,
      room,
      message: message || "Shared an attachment.",
      attachments,
      pinned: Boolean(body.pinned),
      readBy: [auth.user._id]
    });

    const populated = await ChatMessage.findById(saved._id).populate("senderId", "name role chatStatus status").lean();

    return NextResponse.json({
      message: {
        _id: populated._id.toString(),
        message: populated.message,
        room: populated.room,
        sender: publicChatSender(populated.senderId),
        isMine: true,
        attachments: populated.attachments || [],
        pinned: Boolean(populated.pinned),
        readCount: populated.readBy?.length || 1,
        createdAt: populated.createdAt
      }
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Message could not be sent." }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    if (body.messageId && typeof body.pinned === "boolean") {
      const existing = await ChatMessage.findOne({ _id: body.messageId, agencyName: auth.user.agencyName }).lean();
      if (!existing) return NextResponse.json({ error: "Message not found." }, { status: 404 });
      if (!(await validateRoomAccess(auth.user, existing.room))) {
        return NextResponse.json({ error: "Chat room not accessible." }, { status: 403 });
      }
      const message = await ChatMessage.findByIdAndUpdate(body.messageId, { pinned: body.pinned }, { new: true });
      if (!message) return NextResponse.json({ error: "Message not found." }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    const allowedStatuses = ["Available", "Busy", "Away", "Offline"];
    const chatStatus = allowedStatuses.includes(body.chatStatus) ? body.chatStatus : "Available";

    const user = await User.findByIdAndUpdate(auth.user._id, { chatStatus }, { new: true }).select("-password").lean();
    return NextResponse.json({ user: publicTeamMember(user, user) });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Availability could not be updated." }, { status: 500 });
  }
}
