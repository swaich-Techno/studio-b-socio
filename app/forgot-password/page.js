"use client";

import { useState } from "react";
import Button from "@/components/Button";
import FormInput from "@/components/FormInput";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    setLoading(false);
    setMessage(data.message || data.error || "Request finished.");
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center bg-slate-50 px-4 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-black text-slate-950">Reset password</h1>
        <p className="mt-2 text-sm text-slate-500">Enter your account email and we will send a reset link.</p>
        <div className="mt-6">
          <FormInput label="Email" name="email" type="email" required />
        </div>
        {message ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{message}</p> : null}
        <Button type="submit" className="mt-6 w-full" disabled={loading}>{loading ? "Sending..." : "Send Reset Link"}</Button>
        <Button href="/login" variant="secondary" className="mt-3 w-full">Back to Login</Button>
      </form>
    </div>
  );
}
