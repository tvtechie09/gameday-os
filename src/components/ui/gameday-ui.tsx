import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { AlertCircle, CheckCircle2, ChevronRight, LoaderCircle, Search } from "lucide-react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type PageShellProps = HTMLAttributes<HTMLDivElement> & {
  size?: "compact" | "default" | "wide";
};

const pageWidths = {
  compact: "max-w-3xl",
  default: "max-w-5xl",
  wide: "max-w-6xl",
};

export function PageShell({ className, size = "default", ...props }: Readonly<PageShellProps>) {
  return <div className={cx("mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8", pageWidths[size], className)} {...props} />;
}

export function PageTitle({
  actions,
  description,
  eyebrow,
  title,
}: Readonly<{ actions?: ReactNode; description?: ReactNode; eyebrow?: string; title: ReactNode }>) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="ui-eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-black leading-tight tracking-[-0.025em] text-[var(--foreground)] sm:text-4xl">{title}</h1>
        {description ? <div className="mt-2 max-w-2xl text-base font-medium leading-7 text-[var(--muted)]">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">{actions}</div> : null}
    </header>
  );
}

export function SectionHeader({
  action,
  description,
  title,
}: Readonly<{ action?: ReactNode; description?: ReactNode; title: ReactNode }>) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-lg font-black leading-tight tracking-[-0.015em] text-[var(--foreground)]">{title}</h2>
        {description ? <p className="mt-1 text-sm font-medium leading-6 text-[var(--muted)]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Card({ className, ...props }: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return <div className={cx("ui-surface", className)} {...props} />;
}

export function GameDayCard({ className, ...props }: Readonly<HTMLAttributes<HTMLElement>>) {
  return <article className={cx("ui-surface p-4 sm:p-5", className)} {...props} />;
}

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const statusToneClasses: Record<StatusTone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-sky-50 text-sky-800 ring-sky-200",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-50 text-amber-900 ring-amber-200",
  danger: "bg-red-50 text-red-800 ring-red-200",
};

export function StatusChip({ children, className, tone = "neutral" }: Readonly<{ children: ReactNode; className?: string; tone?: StatusTone }>) {
  return (
    <span className={cx("inline-flex min-h-7 shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-extrabold leading-none ring-1 ring-inset", statusToneClasses[tone], className)}>
      {children}
    </span>
  );
}

const alertToneClasses: Record<StatusTone, string> = {
  neutral: "bg-slate-50 text-slate-900 ring-slate-200",
  info: "bg-sky-50 text-sky-950 ring-sky-200",
  success: "bg-emerald-50 text-emerald-950 ring-emerald-200",
  warning: "bg-amber-50 text-amber-950 ring-amber-200",
  danger: "bg-red-50 text-red-950 ring-red-200",
};

export function AlertBanner({ children, className, title, tone = "info" }: Readonly<{ children?: ReactNode; className?: string; title: ReactNode; tone?: StatusTone }>) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  const liveRole = tone === "danger" || tone === "warning" ? "alert" : "status";
  return (
    <div className={cx("flex gap-3 rounded-[var(--radius-lg)] p-4 ring-1 ring-inset", alertToneClasses[tone], className)} role={liveRole}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-extrabold leading-6">{title}</p>
        {children ? <div className="mt-1 text-sm font-medium leading-6 opacity-85">{children}</div> : null}
      </div>
    </div>
  );
}

export type ButtonVariant = "primary" | "secondary" | "destructive" | "quiet";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]",
  secondary: "bg-white text-[var(--foreground)] ring-1 ring-inset ring-[var(--line-strong)] hover:bg-[var(--background-strong)]",
  destructive: "bg-[var(--danger)] text-white hover:bg-red-800",
  quiet: "bg-transparent text-[var(--accent-strong)] hover:bg-[var(--accent-soft)]",
};

export function buttonStyles(variant: ButtonVariant = "primary", className?: string) {
  return cx("ui-control inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 text-sm font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-50", buttonVariants[variant], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

function GameDayButton({ className, type = "button", variant, ...props }: ButtonProps & { variant: ButtonVariant }) {
  return <button className={buttonStyles(variant, className)} type={type} {...props} />;
}

export function PrimaryButton(props: Readonly<ButtonProps>) {
  return <GameDayButton variant="primary" {...props} />;
}

export function SecondaryButton(props: Readonly<ButtonProps>) {
  return <GameDayButton variant="secondary" {...props} />;
}

export function DestructiveButton(props: Readonly<ButtonProps>) {
  return <GameDayButton variant="destructive" {...props} />;
}

export function IconButton({ "aria-label": ariaLabel, className, ...props }: Readonly<ButtonProps>) {
  return <button aria-label={ariaLabel} className={buttonStyles("secondary", cx("w-12 px-0", className))} type="button" {...props} />;
}

export function QuickActionButton({ className, ...props }: Readonly<ButtonProps>) {
  return <button className={cx("ui-control flex min-h-16 flex-col items-center justify-center gap-1 rounded-[var(--radius-lg)] bg-white px-3 py-3 text-center text-sm font-extrabold ring-1 ring-inset ring-[var(--line)] transition-colors hover:bg-[var(--accent-soft)] hover:ring-[var(--accent)]", className)} type="button" {...props} />;
}

export function EmptyState({ actionHref, actionLabel, className, message, title }: Readonly<{ actionHref?: string; actionLabel?: string; className?: string; message: ReactNode; title: ReactNode }>) {
  return (
    <div className={cx("rounded-[var(--radius-lg)] bg-[var(--background-strong)] p-6 text-center", className)}>
      <div className="mx-auto h-2 w-14 rounded-full bg-[var(--accent)]" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-black">{title}</h2>
      <div className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-[var(--muted)]">{message}</div>
      {actionHref && actionLabel ? <Link className={buttonStyles("primary", "mt-5")} href={actionHref}>{actionLabel}</Link> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: Readonly<{ label?: string }>) {
  return <div aria-live="polite" className="flex min-h-32 items-center justify-center gap-3 text-sm font-bold text-[var(--muted)]"><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />{label}</div>;
}

export function ErrorState({ message, title = "Something went wrong" }: Readonly<{ message: ReactNode; title?: ReactNode }>) {
  return <AlertBanner title={title} tone="danger">{message}</AlertBanner>;
}

export function InfoRow({ label, value }: Readonly<{ label: ReactNode; value: ReactNode }>) {
  return <div className="flex min-h-12 items-center justify-between gap-4 py-2"><dt className="text-sm font-medium text-[var(--muted)]">{label}</dt><dd className="text-right text-sm font-extrabold text-[var(--foreground)]">{value}</dd></div>;
}

export function ActionRow({ action, description, title }: Readonly<{ action: ReactNode; description?: ReactNode; title: ReactNode }>) {
  return <div className="flex min-h-16 items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="font-extrabold">{title}</p>{description ? <p className="mt-1 text-sm font-medium leading-5 text-[var(--muted)]">{description}</p> : null}</div><div className="shrink-0">{action}</div></div>;
}

export function FormField({ children, error, hint, htmlFor, label, required }: Readonly<{ children: ReactNode; error?: string; hint?: string; htmlFor: string; label: string; required?: boolean }>) {
  const detailId = error || hint ? `${htmlFor}-detail` : undefined;
  return <div className="grid gap-2"><label className="text-sm font-extrabold" htmlFor={htmlFor}>{label}{required ? <span aria-hidden="true" className="text-[var(--danger)]"> *</span> : null}</label>{children}{error || hint ? <p className={cx("text-sm leading-5", error ? "font-bold text-[var(--danger)]" : "text-[var(--muted)]")} id={detailId}>{error ?? hint}</p> : null}</div>;
}

export function SelectField({ className, id, label, ...props }: Readonly<SelectHTMLAttributes<HTMLSelectElement> & { label: string }>) {
  const resolvedId = id ?? props.name;
  if (!resolvedId) throw new Error("SelectField requires an id or name");
  return <FormField htmlFor={resolvedId} label={label} required={props.required}><select className={cx("ui-input", className)} id={resolvedId} {...props} /></FormField>;
}

export function SearchField({ className, id = "search", label = "Search", ...props }: Readonly<InputHTMLAttributes<HTMLInputElement> & { label?: string }>) {
  return <label className="relative block" htmlFor={id}><span className="sr-only">{label}</span><Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" /><input className={cx("ui-input pl-10", className)} id={id} type="search" {...props} /></label>;
}

export function Tabs({ items, label }: Readonly<{ items: Array<{ active?: boolean; href: string; label: string }>; label: string }>) {
  return <nav aria-label={label} className="flex gap-1 overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--background-strong)] p-1">{items.map((item) => <Link aria-current={item.active ? "page" : undefined} className={cx("ui-control min-h-11 shrink-0 rounded-[var(--radius-md)] px-4 text-sm font-extrabold", item.active ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]")} href={item.href} key={item.href}>{item.label}</Link>)}</nav>;
}

export function RowLink({ children, href }: Readonly<{ children: ReactNode; href: string }>) {
  return <Link className="flex min-h-12 items-center justify-between gap-3 rounded-[var(--radius-md)] px-3 py-2 font-bold transition-colors hover:bg-[var(--accent-soft)]" href={href}>{children}<ChevronRight className="h-5 w-5 shrink-0 text-[var(--muted)]" aria-hidden="true" /></Link>;
}
