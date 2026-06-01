import Link from "next/link";

export default function Button({ href, children, variant = "primary", className = "", type = "button", ...props }) {
  const variants = {
    primary: "bg-accent text-white hover:bg-accent-dark",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
    danger: "bg-red-50 text-red-700 hover:bg-red-100"
  };

  const classes = `inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
