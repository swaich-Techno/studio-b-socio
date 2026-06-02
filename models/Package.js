import mongoose from "mongoose";

const PackageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    monthlyPrice: { type: Number, default: 0 },
    postsPerMonth: { type: Number, default: 0 },
    reelsPerMonth: { type: Number, default: 0 },
    storiesPerMonth: { type: Number, default: 0 },
    adManagementIncluded: { type: Boolean, default: false },
    reportIncluded: { type: Boolean, default: true },
    notes: { type: String, default: "" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.Package || mongoose.model("Package", PackageSchema);
