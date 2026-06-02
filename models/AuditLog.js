import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    agencyName: { type: String, default: "", index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true, index: true },
    entityType: { type: String, default: "", index: true },
    entityId: { type: String, default: "" },
    details: { type: Object, default: {} },
    ipAddress: { type: String, default: "" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
