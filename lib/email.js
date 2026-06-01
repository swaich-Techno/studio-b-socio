export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function sendEmail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return { sent: false, reason: "Email provider not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text
    })
  });

  if (!response.ok) {
    return { sent: false, reason: "Email provider rejected the message." };
  }

  return { sent: true };
}

export async function sendVerificationEmail({ user, token }) {
  const url = `${appUrl()}/api/auth/verify?token=${token}`;
  const subject = "Verify your B Socio Studio account";
  const text = `Verify your B Socio Studio account: ${url}`;
  const html = `<p>Hi ${user.name},</p><p>Please verify your B Socio Studio account before admin approval.</p><p><a href="${url}">Verify email</a></p>`;
  const result = await sendEmail({ to: user.email, subject, text, html });
  return { ...result, url };
}

export async function sendPasswordResetEmail({ user, token }) {
  const url = `${appUrl()}/reset-password?token=${token}`;
  const subject = "Reset your B Socio Studio password";
  const text = `Reset your B Socio Studio password: ${url}`;
  const html = `<p>Hi ${user.name},</p><p>Use this secure link to reset your password.</p><p><a href="${url}">Reset password</a></p>`;
  const result = await sendEmail({ to: user.email, subject, text, html });
  return { ...result, url };
}
