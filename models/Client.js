import mongoose from "mongoose";

const ClientSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    agencyName: { type: String, default: "" },
    businessName: { type: String, required: true, trim: true },
    industry: { type: String, required: true },
    businessType: { type: String, default: "" },
    location: { type: String, default: "" },
    contactPerson: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    instagramHandle: { type: String, default: "" },
    facebookPage: { type: String, default: "" },
    whatsappNumber: { type: String, default: "" },
    brandColors: { type: String, default: "" },
    targetAudience: { type: String, default: "" },
    mainProducts: { type: String, default: "" },
    pipelineStatus: { type: String, enum: ["Lead", "Onboarding", "Active", "Paused", "Lost"], default: "Active", index: true },
    packageName: { type: String, default: "" },
    monthlyFee: { type: Number, default: 0 },
    advancePaid: { type: Number, default: 0 },
    balancePending: { type: Number, default: 0 },
    postsPerMonth: { type: Number, default: 0 },
    reelsPerMonth: { type: Number, default: 0 },
    storiesPerMonth: { type: Number, default: 0 },
    startDate: { type: Date },
    renewalDate: { type: Date },
    contractUrl: { type: String, default: "" },
    visibleToAllTeam: { type: Boolean, default: false },
    assignedTeamMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    assignedDesigner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedReelEditor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedPhotographer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedAdsManager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedCoordinator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    brandBrain: {
      brandTone: { type: String, default: "" },
      doNotUseWords: { type: String, default: "" },
      preferredLanguage: { type: String, default: "" },
      brandColors: { type: String, default: "" },
      mainAudience: { type: String, default: "" },
      bestSellingProducts: { type: String, default: "" },
      competitors: { type: String, default: "" },
      commonQuestions: { type: String, default: "" },
      previousSuccessfulContent: { type: String, default: "" },
      designPreferences: { type: String, default: "" },
      notes: { type: String, default: "" }
    },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["Lead", "Onboarding", "Active", "Paused", "Lost"], default: "Active" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.Client || mongoose.model("Client", ClientSchema);
