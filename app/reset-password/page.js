"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import FormInput from "@/components/FormInput";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: body.password })
    });
    const data = await response.json();
    setLoading(false);
    setSuccess(response.ok);
    setMessage(data.message || data.error || "Request finished.");
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center bg-slate-50 px-4 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-black text-slate-950">Create new password</h1>
        <p className="mt-2 text-sm text-slate-500">Set a fresh password for your B Socio Studio account.</p>
        <div className="mt-6">
          <FormInput label="New Password" name="password" type="password" minLength={6} required />
        </div>
        {message ? <p className={`mt-4 rounded-xl p-3 text-sm ${success ? "bg-accent-soft text-accent-dark" : "bg-red-50 text-red-700"}`}>{message}</p> : null}
        <Button type="submit" className="mt-6 w-full" disabled={loading || !token}>{loading ? "Saving..." : "Save Password"}</Button>
        <Button href="/login" variant="secondary" className="mt-3 w-full">Back to Login</Button>
      </form>
    </div>
  );
}
