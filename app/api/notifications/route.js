import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import Notification from "@/models/Notification";

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;

  const notifications = await Notification.find({
    agencyName: auth.user.agencyName,
    $or: [{ userId: auth.user._id }, { userId: null }]
  }).sort({ createdAt: -1 }).limit(40).lean();

  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((item) => !item.readAt).length
  });
}

export async function PUT(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  const body = await request.json();

  if (body.id) {
    await Notification.findOneAndUpdate(
      { _id: body.id, agencyName: auth.user.agencyName, $or: [{ userId: auth.user._id }, { userId: null }] },
      { readAt: new Date() }
    );
  } else {
    await Notification.updateMany(
      { agencyName: auth.user.agencyName, $or: [{ userId: auth.user._id }, { userId: null }], readAt: null },
      { readAt: new Date() }
    );
  }

  return NextResponse.json({ success: true });
}
