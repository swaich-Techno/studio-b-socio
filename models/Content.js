import mongoose from "mongoose";

const ContentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    platform: { type: String, required: true },
    contentType: { type: String, required: true },
    goal: { type: String, default: "" },
    tone: { type: String, default: "" },
    language: { type: String, default: "" },
    productName: { type: String, default: "" },
    offerDetails: { type: String, default: "" },
    ideas: { type: [String], default: [] },
    captions: { type: [String], default: [] },
    hashtags: { type: [String], default: [] },
    reelIdeas: { type: [String], default: [] },
    storyIdeas: { type: [String], default: [] },
    posterPrompts: { type: [String], default: [] },
    monthlyCalendar: { type: [Object], default: [] },
    adCopy: { type: [String], default: [] },
    whatsappMessages: { type: [String], default: [] },
    googleReviewRequests: { type: [String], default: [] },
    approvalStatus: {
      type: String,
      enum: ["Idea", "In Design", "Caption Ready", "Waiting Owner Approval", "Waiting Client Approval", "Approved", "Scheduled", "Posted", "Revision Needed"],
      default: "Idea"
    },
    revisionNotes: { type: String, default: "" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.Content || mongoose.model("Content", ContentSchema);
