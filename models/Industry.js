import mongoose from "mongoose";

const IndustrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "Custom" },
    description: { type: String, default: "" },
    defaultContentIdeas: { type: [String], default: [] },
    defaultHashtags: { type: [String], default: [] },
    defaultPosterStyles: { type: [String], default: [] },
    defaultReelIdeas: { type: [String], default: [] }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.Industry || mongoose.model("Industry", IndustrySchema);
