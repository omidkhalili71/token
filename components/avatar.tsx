import { initialsOf } from "@/lib/format";

export function Avatar({
  name,
  src,
  size = "md",
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "lg" ? "h-14 w-14 text-base" : size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-semibold text-primary-ink ring-1 ring-line ${dims} ${className}`}
      aria-hidden="true"
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
