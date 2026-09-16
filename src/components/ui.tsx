import clsx from "clsx";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <section
      className={clsx(
        "rounded-3xl border border-ink-900/10 bg-white/88 p-5 shadow-soft backdrop-blur-sm",
        className
      )}
    >
      {children}
    </section>
  );
}

type CardTitleProps = {
  children: React.ReactNode;
  eyebrow?: string;
};

export function CardTitle({ children, eyebrow }: CardTitleProps) {
  return (
    <div className="flex flex-col gap-1">
      {eyebrow ? (
        <p className="text-xs font-semibold tracking-[0.2em] text-ink-600 uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-lg font-semibold text-ink-950">{children}</h2>
    </div>
  );
}

type BadgeProps = {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  const toneClasses: Record<NonNullable<BadgeProps["tone"]>, string> = {
    neutral: "border-ink-900/10 bg-ink-900/5 text-ink-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        toneClasses[tone]
      )}
    >
      {children}
    </span>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

export function StatCard({ label, value, detail, tone = "neutral" }: StatCardProps) {
  const accent: Record<NonNullable<StatCardProps["tone"]>, string> = {
    neutral: "text-ink-950",
    success: "text-emerald-700",
    warning: "text-amber-800",
    danger: "text-rose-700",
    info: "text-sky-700",
  };

  return (
    <Card>
      <p className="text-sm font-medium text-ink-600">{label}</p>
      <div className={clsx("mt-2 text-3xl font-semibold tracking-tight", accent[tone])}>
        {value}
      </div>
      {detail ? <p className="mt-2 text-sm leading-6 text-ink-700">{detail}</p> : null}
    </Card>
  );
}

type SectionHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-ink-950">{title}</h2>
        {description ? <p className="max-w-3xl text-sm leading-6 text-ink-700">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type StatusPillProps = {
  children: React.ReactNode;
  active?: boolean;
};

export function StatusPill({ children, active = false }: StatusPillProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition",
        active
          ? "border-ink-900 bg-ink-950 text-paper-50"
          : "border-ink-900/10 bg-white text-ink-800 hover:bg-amber-50"
      )}
    >
      {children}
    </span>
  );
}

type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
};

export function Button({
  children,
  variant = "primary",
  className,
  type = "button",
  disabled = false,
  onClick,
}: ButtonProps) {
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-ink-950 text-paper-50 hover:bg-ink-900",
    secondary: "bg-white text-ink-900 border border-ink-900/15 hover:bg-amber-50",
    ghost: "bg-transparent text-ink-800 hover:bg-white",
  };

  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
