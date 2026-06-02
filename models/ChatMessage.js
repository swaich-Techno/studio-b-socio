import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    agencyName: { type: String, required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    room: { type: String, default: "team", index: true },
    message: { type: String, required: true, trim: true, maxlength: 1200 },
    attachments: {
      type: [
        {
          name: { type: String, default: "" },
          url: { type: String, default: "" },
          fileId: { type: mongoose.Schema.Types.ObjectId, ref: "FileAsset" },
          mimeType: { type: String, default: "" }
        }
      ],
      default: []
    },
    pinned: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.ChatMessage || mongoose.model("ChatMessage", ChatMessageSchema);
