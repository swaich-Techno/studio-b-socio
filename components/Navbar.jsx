"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import LanguageSelector, { useLanguage } from "@/components/LanguageSelector";

export default function Navbar({ isPublic }) {
  const router = useRouter();
  const { t } = useLanguage();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link href={isPublic ? "/" : "/dashboard"} className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#071525] text-sm font-black text-white">BS</span>
          <span>
            <span className="block text-sm font-black tracking-tight text-slate-950">B Socio Studio</span>
            <span className="block text-xs text-slate-500">Be Seen. Be Social.</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-2">
          <LanguageSelector />
          {isPublic ? (
            <>
              <Button href="/login" variant="ghost">Login</Button>
              <Button href="/register">Register</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={logout}>{t("Logout")}</Button>
          )}
        </nav>
      </div>
    </header>
  );
}
