import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    agencyName: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    type: { type: String, enum: ["info", "approval", "task", "reminder", "billing", "chat"], default: "info" },
    href: { type: String, default: "" },
    readAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
