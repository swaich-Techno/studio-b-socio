function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toEmailList(value) {
  return String(value || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

export async function sendDemoRequestEmail({ businessName, name, email, phone, industry, message, ticketId, pageUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = toEmailList(process.env.CONTACT_TO_EMAIL || process.env.SUPER_ADMIN_EMAIL);
  const from = process.env.CONTACT_FROM_EMAIL || "AR Design Studio <onboarding@resend.dev>";

  if (!apiKey || !to.length) {
    return { ok: false, skipped: true, reason: "Email is not configured. Add RESEND_API_KEY and CONTACT_TO_EMAIL in Vercel." };
  }

  const subject = `New AR Design Studio demo request - ${businessName || name}`;
  const rows = [
    ["Business", businessName || "Not shared"],
    ["Name", name],
    ["Email", email || "Not shared"],
    ["Phone / WhatsApp", phone],
    ["Industry", industry || "Not shared"],
    ["Requirement", message || "Not shared"],
    ["Ticket ID", ticketId || "Not saved"],
    ["Page", pageUrl || "Not shared"]
  ];

  const htmlRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#0f172a;">${escapeHtml(label)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${escapeHtml(value)}</td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
        <div style="background:#0f172a;color:#ffffff;padding:22px 24px;">
          <p style="margin:0;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#99f6e4;font-weight:800;">AR Design Studio</p>
          <h1 style="margin:8px 0 0;font-size:24px;line-height:1.2;">New free demo request</h1>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tbody>${htmlRows}</tbody>
        </table>
        <div style="padding:18px 24px;color:#64748b;font-size:13px;">
          This email was sent from the public Get Free Demo form.
        </div>
      </div>
    </div>
  `;

  const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  const payload = {
    from,
    to,
    subject,
    html,
    text
  };
  if (email) payload.reply_to = email;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, failed: true, reason: data.message || data.error || "Email provider rejected the request." };
  }

  return { ok: true, id: data.id || "" };
}
