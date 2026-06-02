import { ArrowRight, BarChart3, CalendarDays, ListChecks, Sparkles } from "lucide-react";
import Button from "@/components/Button";

const features = [
  { title: "Client CRM", text: "Keep local business details, brand notes, and contacts in one clean workspace.", icon: ListChecks },
  { title: "Content Engine", text: "Generate captions, ideas, hashtags, reels, stories, and poster prompts without paid AI APIs.", icon: Sparkles },
  { title: "Calendar & Tasks", text: "Plan monthly content and assign work to Aman, Lovejot, and Owner roles.", icon: CalendarDays },
  { title: "Analytics & Reports", text: "Track manual performance data and generate client-ready monthly summaries.", icon: BarChart3 }
];

export default function LandingPage() {
  return (
    <div className="bg-white">
      <section className="page-container px-4 py-16 md:py-24">
        <div className="grid items-center gap-12 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Be Seen. Be Social.</p>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-950 md:text-6xl">
              B Socio Studio
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              A premium agency dashboard for managing local business clients, content planning, trend boards, analytics, tasks, and monthly reports.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/register" className="gap-2">Start Free <ArrowRight size={18} /></Button>
              <Button href="/login" variant="secondary">Login</Button>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4 shadow-soft">
            <div className="rounded-2xl bg-white p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-sm text-slate-500">This month</p>
                  <h2 className="text-2xl font-black text-slate-950">Agency Command Center</h2>
                </div>
                <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent-dark">Live workspace</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {["18 posts planned", "7 reports ready", "12 pending tasks", "4 trend tests"].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-100 p-4 text-sm font-semibold text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white">
                <p className="text-sm text-slate-300">Next action</p>
                <p className="mt-2 text-lg font-bold">Generate sweet shop festive reel plan for Instagram.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50 px-4 py-16">
        <div className="page-container">
          <h2 className="section-title">Built for local business marketing work</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
                  <Icon className="text-accent" size={24} />
                  <h3 className="mt-5 text-lg font-bold text-slate-950">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
