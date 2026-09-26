import { Search } from "lucide-react";
import type { FormEvent } from "react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  id?: string;
};

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Search textbooks, bikes, electronics…",
  id = "marketplace-search",
}: SearchBarProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <form role="search" onSubmit={handleSubmit} className="relative w-full">
      <label htmlFor={id} className="sr-only">
        Search listings
      </label>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="field-control rounded-xl py-3 pl-10 pr-3 shadow-sm"
      />
    </form>
  );
}
