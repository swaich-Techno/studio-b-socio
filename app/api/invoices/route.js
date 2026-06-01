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
    userId: user._id,
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

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "manage_billing")) {
    return NextResponse.json({ error: "You do not have permission to view billing." }, { status: 403 });
  }
  const invoices = await Invoice.find({ userId: auth.user._id }).populate("clientId", "businessName email whatsappNumber phone").populate("packageId", "name").sort({ createdAt: -1 }).lean();
  return NextResponse.json({ invoices });
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "manage_billing")) {
      return NextResponse.json({ error: "You do not have permission to manage billing." }, { status: 403 });
    }
    const body = await request.json();
    const invoice = await Invoice.create(normalizeInvoice(body, auth.user));
    await createAuditLog({ request, user: auth.user, action: "invoice_created", entityType: "Invoice", entityId: invoice._id, details: { invoiceNumber: invoice.invoiceNumber, amount: invoice.amount } });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Invoice save failed." }, { status: 500 });
  }
}
