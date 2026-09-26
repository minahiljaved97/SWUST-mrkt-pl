import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({
  label,
  error,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? props.name ?? "input";

  return (
    <label className="flex w-full flex-col gap-1 text-sm text-slate-700" htmlFor={inputId}>
      <span className="font-medium">{label}</span>
      <input
        id={inputId}
        className={`rounded-md border px-3 py-2 text-slate-900 outline-none focus:border-slate-900 ${
          error ? "border-red-500" : "border-slate-300"
        } ${className}`}
        {...props}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
