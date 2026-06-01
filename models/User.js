import mongoose from "mongoose";

const PermissionSchema = new mongoose.Schema(
  {
    create_content: { type: Boolean, default: false },
    approve_posts: { type: Boolean, default: false },
    manage_clients: { type: Boolean, default: false },
    manage_team: { type: Boolean, default: false },
    manage_billing: { type: Boolean, default: false },
    manage_ads: { type: Boolean, default: false },
    view_analytics: { type: Boolean, default: false },
    view_reports: { type: Boolean, default: false },
    assign_tasks: { type: Boolean, default: false },
    manage_calendar: { type: Boolean, default: false }
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    agencyName: { type: String, required: true, trim: true },
    role: { type: String, default: "Intern" },
    status: { type: String, enum: ["pending", "approved", "rejected", "suspended"], default: "pending", index: true },
    emailVerified: { type: Boolean, default: false, index: true },
    emailVerificationToken: { type: String, default: "", index: true },
    emailVerificationExpires: { type: Date },
    passwordResetToken: { type: String, default: "", index: true },
    passwordResetExpires: { type: Date },
    permissions: { type: PermissionSchema, default: () => ({}) },
    skills: { type: [String], default: [] },
    assignedClients: [{ type: mongoose.Schema.Types.ObjectId, ref: "Client" }],
    chatStatus: { type: String, enum: ["Available", "Busy", "Away", "Offline"], default: "Available" },
    logoUrl: { type: String, default: "" },
    ownerName: { type: String, default: "" },
    phone: { type: String, default: "" },
    defaultCurrency: { type: String, default: "INR" },
    defaultLanguage: { type: String, default: "English" },
    teamMembers: { type: [String], default: ["Aman", "Lovejot", "Owner"] }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
