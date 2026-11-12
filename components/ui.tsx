export function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card bg-card shadow-sm ring-1 ring-line ${className}`}>{children}</section>
  );
}

type BadgeVariant = "primary" | "success" | "danger" | "neutral";

const badgeStyles: Record<BadgeVariant, string> = {
  primary: "bg-primary-soft text-primary-ink",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-canvas text-muted",
};

export function Badge({
  variant = "neutral",
  children,
  dot,
  icon,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: "success" | "neutral";
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${badgeStyles[variant]}`}
    >
      {dot ? (
        <span className={`h-1.5 w-1.5 rounded-full ${dot === "success" ? "bg-success" : "bg-muted/60"}`} />
      ) : null}
      {icon}
      {children}
    </span>
  );
}

export function Skeleton({ className = "h-4 w-24" }: { className?: string }) {
  return <span className={`block animate-pulse rounded-lg bg-canvas ${className}`} aria-hidden="true" />;
}

export function StateMessage({
  title,
  description,
  tone = "neutral",
  action,
}: {
  title: string;
  description?: string;
  tone?: "neutral" | "error";
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <p className={`text-sm font-bold ${tone === "error" ? "text-danger" : "text-ink"}`}>{title}</p>
      {description ? <p className="max-w-xs text-xs leading-6 text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
