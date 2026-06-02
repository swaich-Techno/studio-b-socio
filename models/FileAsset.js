import mongoose from "mongoose";

const FileAssetSchema = new mongoose.Schema(
  {
    agencyName: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", index: true },
    module: { type: String, enum: ["client", "task", "chat", "report", "brand"], default: "client", index: true },
    category: { type: String, default: "" },
    name: { type: String, required: true },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
    data: { type: String, required: true },
    notes: { type: String, default: "" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.FileAsset || mongoose.model("FileAsset", FileAssetSchema);
