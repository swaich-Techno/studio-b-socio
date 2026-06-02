"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/Button";

export default function InactivePage() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-soft">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-lg font-black text-red-700">!</span>
        <h1 className="mt-6 text-3xl font-black text-slate-950">Your account is not active.</h1>
        <p className="mt-3 text-slate-600">Please contact admin.</p>
        <Button className="mt-6" variant="secondary" onClick={logout}>Logout</Button>
      </section>
    </div>
  );
}
