import mongoose from "mongoose";

const ImageAssetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    productName: { type: String, default: "" },
    platformSize: { type: String, default: "" },
    style: { type: String, default: "" },
    prompt: { type: String, default: "" },
    negativePrompt: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    status: { type: String, enum: ["Prompt Only", "Generated", "Downloaded", "Approved", "Rejected"], default: "Prompt Only" },
    approvalStatus: {
      type: String,
      enum: ["Idea", "In Design", "Caption Ready", "Waiting Owner Approval", "Waiting Client Approval", "Approved", "Scheduled", "Posted", "Revision Needed"],
      default: "Idea"
    },
    notes: { type: String, default: "" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.ImageAsset || mongoose.model("ImageAsset", ImageAssetSchema);
