import mongoose from "mongoose";

const ClientApprovalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    contentType: { type: String, required: true },
    approvalToken: { type: String, required: true, index: true },
    status: { type: String, enum: ["Waiting Client Approval", "Approved", "Revision Needed", "Rejected"], default: "Waiting Client Approval" },
    clientComments: { type: String, default: "" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.ClientApproval || mongoose.model("ClientApproval", ClientApprovalSchema);
