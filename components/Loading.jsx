export default function Loading({ label = "Loading..." }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-soft">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-accent" />
      {label}
    </div>
  );
}
