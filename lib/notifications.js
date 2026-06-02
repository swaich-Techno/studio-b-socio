import Notification from "@/models/Notification";
import User from "@/models/User";

export async function createNotification({ agencyName, userId, title, message = "", type = "info", href = "", createdBy }) {
  if (!agencyName || !title) return null;
  return Notification.create({ agencyName, userId, title, message, type, href, createdBy });
}

export async function notifyAdmins({ agencyName, title, message = "", type = "info", href = "", createdBy }) {
  if (!agencyName) return [];
  const admins = await User.find({ agencyName, status: "approved", role: { $in: ["Owner/Admin", "Owner"] } }).select("_id").lean();
  return Promise.all(admins.map((admin) => createNotification({ agencyName, userId: admin._id, title, message, type, href, createdBy })));
}
