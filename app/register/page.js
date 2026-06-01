"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import FormInput from "@/components/FormInput";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Registration failed.");
      return;
    }
    if (data.user?.status === "approved") {
      router.push("/dashboard");
    } else {
      router.push("/pending");
    }
    router.refresh();
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center bg-slate-50 px-4 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-black text-slate-950">Create your agency account</h1>
        <p className="mt-2 text-sm text-slate-500">Start managing B Socio Studio clients and content.</p>
        <div className="mt-6 grid gap-4">
          <FormInput label="Name" name="name" required />
          <FormInput label="Email" name="email" type="email" required />
          <FormInput label="Password" name="password" type="password" required minLength={6} />
          <FormInput label="Agency Name" name="agencyName" defaultValue="B Socio Studio" required />
        </div>
        {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <Button type="submit" className="mt-6 w-full" disabled={loading}>{loading ? "Creating..." : "Register"}</Button>
      </form>
    </div>
  );
}
