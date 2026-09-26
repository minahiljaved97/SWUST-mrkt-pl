import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldShellProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

function FieldShell({ label, htmlFor, error, hint, children }: FieldShellProps) {
  return (
    <div className="w-full">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
      {error ? (
        <p className="mt-1.5 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Input({
  label,
  error,
  hint,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? props.name ?? "input";
  return (
    <FieldShell label={label} htmlFor={inputId} error={error} hint={hint}>
      <input
        id={inputId}
        className={`field-control ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""} ${className}`}
        aria-invalid={Boolean(error) || undefined}
        {...props}
      />
    </FieldShell>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Textarea({
  label,
  error,
  hint,
  id,
  className = "",
  ...props
}: TextareaProps) {
  const inputId = id ?? props.name ?? "textarea";
  return (
    <FieldShell label={label} htmlFor={inputId} error={error} hint={hint}>
      <textarea
        id={inputId}
        className={`field-control min-h-28 resize-y ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""} ${className}`}
        aria-invalid={Boolean(error) || undefined}
        {...props}
      />
    </FieldShell>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Select({
  label,
  error,
  hint,
  id,
  className = "",
  children,
  ...props
}: SelectProps) {
  const inputId = id ?? props.name ?? "select";
  return (
    <FieldShell label={label} htmlFor={inputId} error={error} hint={hint}>
      <select
        id={inputId}
        className={`field-control ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""} ${className}`}
        aria-invalid={Boolean(error) || undefined}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}
