"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, BookOpen, CalendarDays, CheckCircle2, Clapperboard, FileText, Home, Image, ListChecks, Menu, MessageCircle, Search, Sparkles, Store, TrendingUp, Users, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageSelector";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/clients", label: "Clients", icon: Store },
  { href: "/catalogues", label: "Catalogues", icon: BookOpen },
  { href: "/content-generator", label: "Generator", icon: Sparkles },
  { href: "/reels", label: "Reels", icon: Clapperboard },
  { href: "/ai-image-studio", label: "Image Prompts", icon: Image },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/financials", label: "Financials", icon: WalletCards },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/search", label: "Search", icon: Search },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/team", label: "Team", icon: Users },
  { href: "/approvals", label: "Approvals", icon: CheckCircle2 }
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  const nav = (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-white text-[#071525]" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
            title={t(item.label)}
          >
            <Icon size={19} />
            <span>{t(item.label)}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 grid h-12 w-12 place-items-center rounded-2xl bg-[#071525] text-white shadow-soft md:hidden"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>
      <aside className="fixed inset-y-16 left-0 z-30 hidden w-64 border-r border-white/10 bg-[#071525] px-4 py-6 md:block">
        {nav}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/50 md:hidden">
          <aside className="h-full w-[82vw] max-w-xs bg-[#071525] p-4 shadow-soft">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-white">B Socio Studio</p>
                <p className="text-xs text-slate-400">Be Seen. Be Social.</p>
              </div>
              <button className="rounded-xl bg-white/10 p-2 text-white" onClick={() => setOpen(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}
    </>
  );
}
