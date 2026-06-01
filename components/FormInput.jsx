export default function FormInput({ label, name, type = "text", textarea = false, options, className = "", ...props }) {
  const inputClasses = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent-soft";

  return (
    <label className={`block text-sm font-medium text-slate-700 ${className}`}>
      <span>{label}</span>
      {options ? (
        <select name={name} className={inputClasses} {...props}>
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : textarea ? (
        <textarea name={name} rows={4} className={inputClasses} {...props} />
      ) : (
        <input name={name} type={type} className={inputClasses} {...props} />
      )}
    </label>
  );
}
