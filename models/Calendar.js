import mongoose from "mongoose";

const CalendarSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    date: { type: Date, required: true },
    dueDate: { type: Date },
    postDate: { type: Date },
    platform: { type: String, required: true },
    contentType: { type: String, required: true },
    topic: { type: String, required: true },
    caption: { type: String, default: "" },
    hashtags: { type: String, default: "" },
    status: { type: String, enum: ["Idea", "In Progress", "Need Owner Approval", "Sent to Client", "Client Revision", "Approved", "Scheduled", "Posted"], default: "Idea" },
    approvalStatus: { type: String, enum: ["Idea", "In Progress", "Need Owner Approval", "Sent to Client", "Client Revision", "Approved", "Scheduled", "Posted"], default: "Idea" },
    assignedTo: { type: String, default: "" },
    revisionNotes: { type: String, default: "" },
    notes: { type: String, default: "" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.Calendar || mongoose.model("Calendar", CalendarSchema);
