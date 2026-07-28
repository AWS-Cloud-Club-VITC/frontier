/**
 * Vector stand-in for the AWS Student Builder Groups chip mark.
 * Swap for the real artwork by dropping the PNG in /public and
 * replacing the <svg> with an <Image>. Geometry matches the PPT template.
 */
export function ChipMark({
  size = 32,
  main = "#7C4DE8",
  inner = "#FFFFFF",
  className = "",
}: {
  size?: number;
  main?: string;
  inner?: string;
  className?: string;
}) {
  // viewBox is 100x100 for the body plus 20 units of tab overhang on each side
  return (
    <svg
      width={size}
      height={size}
      viewBox="-20 -20 140 140"
      className={className}
      aria-hidden="true"
    >
      <rect x="0" y="0" width="100" height="100" fill={main} />
      <rect x="27" y="27" width="46" height="46" fill={inner} />
      {[17, 66].map((o) => (
        <g key={o} fill={main}>
          <rect x={o} y={-20} width="17" height="20" />
          <rect x={o} y={100} width="17" height="20" />
          <rect x={-20} y={o} width="20" height="17" />
          <rect x={100} y={o} width="20" height="17" />
        </g>
      ))}
    </svg>
  );
}

export function LogoLockup({
  onDark = false,
  className = "",
}: {
  onDark?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <ChipMark size={34} inner={onDark ? "#0E141B" : "#FFFFFF"} />
      <div className="leading-tight">
        <div
          className={`font-sans text-[11px] font-bold uppercase tracking-[0.08em] ${
            onDark ? "text-paper" : "text-ink"
          }`}
        >
          AWS Student Builder Groups
        </div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-purple">
          VIT Chennai
        </div>
      </div>
    </div>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display tracking-tight ${className}`}>
      FRONT<span className="text-purple">IER</span>
    </span>
  );
}
