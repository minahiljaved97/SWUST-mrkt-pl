import { AlertTriangle } from "lucide-react";

type ErrorMessageProps = {
  message: string;
  title?: string;
};

export function ErrorMessage({
  message,
  title = "Something went wrong",
}: ErrorMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-sm">{message}</p>
      </div>
    </div>
  );
}
