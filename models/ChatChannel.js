import mongoose from "mongoose";

const ChatChannelSchema = new mongoose.Schema(
  {
    agencyName: { type: String, required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    topic: { type: String, default: "" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    pinnedMessage: { type: String, default: "" },
    isDefault: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

ChatChannelSchema.index({ agencyName: 1, slug: 1 }, { unique: true });

export default mongoose.models.ChatChannel || mongoose.model("ChatChannel", ChatChannelSchema);
