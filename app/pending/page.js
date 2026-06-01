"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/Button";

export default function PendingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((res) => res.json()).then((data) => setUser(data.user));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function resendVerification() {
    setMessage("Sending verification email...");
    const response = await fetch("/api/auth/verify/resend", { method: "POST" });
    const data = await response.json();
    setMessage(data.message || data.error || "Verification request finished.");
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-soft">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-lg font-black text-accent-dark">BS</span>
        <h1 className="mt-6 text-3xl font-black text-slate-950">Your account is waiting for admin approval.</h1>
        <p className="mt-3 text-slate-600">Please contact B Socio Studio owner.</p>
        {user && !user.emailVerified ? (
          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-bold">Email verification is required before approval.</p>
            <p className="mt-1">Check your inbox, or request a new verification email.</p>
            <Button className="mt-4" onClick={resendVerification}>Resend Verification Email</Button>
          </div>
        ) : null}
        {message ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p> : null}
        <Button className="mt-6" variant="secondary" onClick={logout}>Logout</Button>
      </section>
    </div>
  );
}
