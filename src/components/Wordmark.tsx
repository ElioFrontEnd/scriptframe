/**
 * The Cutframe mark: a frame split along a diagonal, one half ink and one
 * half clay — a frame, cut. It reads at 16px, which is the only test a mark
 * like this has to pass.
 */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="32" height="32" rx="7" fill="var(--ink)" />
      <path d="M8 10.5a2.5 2.5 0 0 1 2.5-2.5H18v4h-5.5v9H8Z" fill="var(--paper)" />
      <path d="M24 21.5a2.5 2.5 0 0 1-2.5 2.5H14v-4h5.5v-9H24Z" fill="var(--clay)" />
    </svg>
  );
}

export default function Wordmark({
  size = 22,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={size} />
      <span
        className="text-[19px] font-medium tracking-[-0.01em]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Cutframe
      </span>
    </span>
  );
}
