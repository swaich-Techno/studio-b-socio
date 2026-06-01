import mongoose from "mongoose";

const CatalogueItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "" },
    price: { type: Number, default: 0 },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    notes: { type: String, default: "" }
  },
  { _id: true }
);

const CatalogueSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    type: { type: String, enum: ["Catalogue", "Menu", "Price List", "Service List"], default: "Catalogue" },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["Draft", "Published", "Archived"], default: "Draft", index: true },
    coverImageUrl: { type: String, default: "" },
    items: [CatalogueItemSchema],
    notes: { type: String, default: "" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.Catalogue || mongoose.model("Catalogue", CatalogueSchema);
