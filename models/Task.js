import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    title: { type: String, required: true },
    assignedTo: { type: String, required: true },
    category: { type: String, default: "" },
    description: { type: String, default: "" },
    dueDate: { type: Date, required: true },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    status: { type: String, enum: ["Not Started", "In Progress", "Need Review", "Revision", "Completed"], default: "Not Started" },
    attachmentLink: { type: String, default: "" },
    approvalStatus: {
      type: String,
      enum: ["Idea", "In Design", "Caption Ready", "Waiting Owner Approval", "Waiting Client Approval", "Approved", "Scheduled", "Posted", "Revision Needed"],
      default: "Idea"
    },
    revisionNotes: { type: String, default: "" },
    notes: { type: String, default: "" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.Task || mongoose.model("Task", TaskSchema);
