import Button from "@/components/Button";

export default function EmptyState({ title, message, actionHref, actionLabel }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <h3 className="text-lg font-bold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">{message}</p>
      {actionHref && actionLabel ? (
        <Button href={actionHref} className="mt-5">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
