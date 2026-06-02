import mongoose from "mongoose";

const InvoiceLineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 }
  },
  { _id: true }
);

const InvoiceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
    invoiceNumber: { type: String, default: "", index: true },
    issueDate: { type: Date },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    customerEmail: { type: String, default: "" },
    customerWhatsapp: { type: String, default: "" },
    billingFrom: { type: String, default: "B Socio Studio" },
    billingAddress: { type: String, default: "" },
    lineItems: { type: [InvoiceLineItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    status: { type: String, enum: ["Unpaid", "Partially Paid", "Paid", "Overdue", "Cancelled"], default: "Unpaid" },
    dueDate: { type: Date },
    notes: { type: String, default: "" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
