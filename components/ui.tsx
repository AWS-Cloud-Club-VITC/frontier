import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ---------- surfaces ---------- */

export function Panel({
  children,
  className = "",
  tone = "paper",
}: {
  children: ReactNode;
  className?: string;
  tone?: "paper" | "ink" | "purple" | "wash";
}) {
  const tones = {
    paper: "bg-paper text-ink",
    ink: "bg-ink text-paper",
    purple: "bg-purple text-paper",
    wash: "bg-purple-wash text-ink",
  };
  return (
    <div className={`border-[3px] border-ink shadow-brut ${tones[tone]} ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  index,
  title,
  kicker,
  onDark = false,
}: {
  index: string;
  title: string;
  kicker?: string;
  onDark?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center border-[3px] border-ink bg-ink font-mono text-sm font-bold text-paper">
        {index}
      </div>
      <div className="pt-0.5">
        <h2
          className={`font-display text-2xl leading-none sm:text-3xl ${
            onDark ? "text-paper" : "text-ink"
          }`}
        >
          {title}
        </h2>
        {kicker && <p className="label mt-2">{kicker}</p>}
      </div>
    </div>
  );
}

/* ---------- controls ---------- */

const buttonBase =
  "inline-flex items-center justify-center gap-2 border-[3px] border-ink px-6 py-3 font-sans text-sm font-bold uppercase tracking-wide " +
  "shadow-brut-sm transition-all duration-100 hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none " +
  "active:translate-x-[4px] active:translate-y-[4px] disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary: "bg-purple text-paper",
  dark: "bg-ink text-paper",
  paper: "bg-paper text-ink",
  orange: "bg-orange text-ink",
  danger: "bg-paper text-ink hover:bg-ink hover:text-paper",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof variants }) {
  return (
    <button className={`${buttonBase} ${variants[variant]} ${className}`} {...props} />
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof variants }) {
  return <Link className={`${buttonBase} ${variants[variant]} ${className}`} {...props} />;
}

export function Field({
  label,
  hint,
  className = "",
  ...props
}: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="label-muted">{label}</span>
      <input className={`field mt-2 ${className}`} {...props} />
      {hint && <span className="mt-1.5 block font-sans text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  children,
  className = "",
  ...props
}: ComponentProps<"select"> & { label: string }) {
  return (
    <label className="block">
      <span className="label-muted">{label}</span>
      <select className={`field mt-2 ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}

/* ---------- feedback ---------- */

export function Notice({
  tone = "error",
  children,
}: {
  tone?: "error" | "ok" | "info";
  children: ReactNode;
}) {
  const tones = {
    error: "bg-ink text-paper",
    ok: "bg-purple text-paper",
    info: "bg-purple-wash text-ink",
  };
  return (
    <div
      className={`border-[3px] border-ink px-4 py-3 font-sans text-sm font-medium ${tones[tone]}`}
      role="status"
    >
      {children}
    </div>
  );
}

export function Chip({
  children,
  tone = "ink",
}: {
  children: ReactNode;
  tone?: "ink" | "purple" | "orange" | "outline";
}) {
  const tones = {
    ink: "bg-ink text-paper border-ink",
    purple: "bg-purple text-paper border-ink",
    orange: "bg-orange text-ink border-ink",
    outline: "bg-paper text-ink border-ink",
  };
  return (
    <span
      className={`inline-block border-[3px] px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
