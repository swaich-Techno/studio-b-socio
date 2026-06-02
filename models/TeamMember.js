import mongoose from "mongoose";

const PermissionSchema = new mongoose.Schema(
  {
    canViewClients: { type: Boolean, default: true },
    canEditClients: { type: Boolean, default: false },
    canCreateContent: { type: Boolean, default: false },
    canApprovePosts: { type: Boolean, default: false },
    canViewAnalytics: { type: Boolean, default: false },
    canGenerateReports: { type: Boolean, default: false },
    canManageBilling: { type: Boolean, default: false },
    canManageTeam: { type: Boolean, default: false }
  },
  { _id: false }
);

const TeamMemberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    phone: { type: String, default: "" },
    role: { type: String, required: true },
    skills: { type: String, default: "" },
    salaryType: { type: String, enum: ["Monthly", "Per Project", "Hourly", "Commission", "Internship"], default: "Monthly" },
    salaryAmount: { type: Number, default: 0 },
    assignedClients: [{ type: mongoose.Schema.Types.ObjectId, ref: "Client" }],
    permissions: { type: PermissionSchema, default: () => ({}) },
    status: { type: String, enum: ["Active", "Paused", "Left"], default: "Active" },
    notes: { type: String, default: "" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.TeamMember || mongoose.model("TeamMember", TeamMemberSchema);
