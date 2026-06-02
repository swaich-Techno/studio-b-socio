import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    summary: { type: String, default: "" },
    completedWork: { type: String, default: "" },
    analyticsSummary: { type: String, default: "" },
    bestContent: { type: String, default: "" },
    nextMonthSuggestions: { type: String, default: "" },
    platformsHandled: { type: [String], default: [] },
    totals: { type: Object, default: {} }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.Report || mongoose.model("Report", ReportSchema);
