import { NextResponse } from "next/server";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import Invoice from "@/models/Invoice";

function normalizeLineItems(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item?.description)
    .map((item) => {
      const quantity = Number(item.quantity || 1);
      const rate = Number(item.rate || 0);
      return {
        description: String(item.description || "").trim(),
        quantity,
        rate,
        amount: Number(item.amount || quantity * rate || 0)
      };
    });
}

function normalizeInvoice(body, user) {
  const lineItems = normalizeLineItems(body.lineItems);
  const subtotal = lineItems.length ? lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0) : Number(body.subtotal || body.amount || 0);
  const discount = Number(body.discount || 0);
  const tax = Number(body.tax || 0);
  const amount = Number(body.amount || Math.max(subtotal - discount + tax, 0));

  return {
    ...body,
    packageId: body.packageId || undefined,
    invoiceNumber: body.invoiceNumber || `BSS-${Date.now()}`,
    issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
    month: Number(body.month),
    year: Number(body.year),
    customerEmail: body.customerEmail || "",
    customerWhatsapp: body.customerWhatsapp || "",
    billingFrom: body.billingFrom || user.agencyName || "B Socio Studio",
    billingAddress: body.billingAddress || "",
    lineItems,
    subtotal,
    discount,
    tax,
    amount,
    paidAmount: Number(body.paidAmount || 0),
    dueDate: body.dueDate ? new Date(body.dueDate) : undefined
  };
}

export async function GET(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "manage_billing")) {
    return NextResponse.json({ error: "You do not have permission to view billing." }, { status: 403 });
  }
  const { id } = await context.params;
  const invoice = await Invoice.findOne({ _id: id, userId: auth.user._id }).populate("clientId", "businessName industry location contactPerson email phone whatsappNumber").populate("packageId", "name").lean();
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  return NextResponse.json({ invoice });
}

export async function PUT(request, context) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "manage_billing")) {
      return NextResponse.json({ error: "You do not have permission to manage billing." }, { status: 403 });
    }
    const { id } = await context.params;
    const body = await request.json();
    const invoice = await Invoice.findOneAndUpdate({ _id: id, userId: auth.user._id }, normalizeInvoice(body, auth.user), { new: true, runValidators: true });
    if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    await createAuditLog({ request, user: auth.user, action: "invoice_updated", entityType: "Invoice", entityId: id, details: { invoiceNumber: invoice.invoiceNumber, amount: invoice.amount } });
    return NextResponse.json({ invoice });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Invoice update failed." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user)) {
    return NextResponse.json({ error: "Only Owner/Admin can permanently delete invoices." }, { status: 403 });
  }
  const { id } = await context.params;
  const invoice = await Invoice.findOneAndDelete({ _id: id, userId: auth.user._id });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  await createAuditLog({ request, user: auth.user, action: "invoice_deleted", entityType: "Invoice", entityId: id, details: { amount: invoice.amount, status: invoice.status } });
  return NextResponse.json({ success: true });
}
