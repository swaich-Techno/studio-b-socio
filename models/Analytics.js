import mongoose from "mongoose";

const AnalyticsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    platform: { type: String, required: true },
    date: { type: Date, required: true },
    followers: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    profileVisits: { type: Number, default: 0 },
    websiteClicks: { type: Number, default: 0 },
    whatsappClicks: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    salesEstimate: { type: Number, default: 0 },
    notes: { type: String, default: "" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.Analytics || mongoose.model("Analytics", AnalyticsSchema);
