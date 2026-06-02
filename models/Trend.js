import mongoose from "mongoose";

const TrendSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    industry: { type: String, required: true },
    platform: { type: String, required: true },
    title: { type: String, required: true },
    trendType: { type: String, required: true },
    description: { type: String, default: "" },
    usageIdea: { type: String, default: "" },
    status: { type: String, enum: ["New", "Testing", "Used", "Archived"], default: "New" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.Trend || mongoose.model("Trend", TrendSchema);
