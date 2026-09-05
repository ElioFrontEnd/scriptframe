const LABELS: Record<string, { text: string; className: string }> = {
  draft: { text: "Draft", className: "chip-neutral" },
  prompts_ready: { text: "Ready", className: "chip-warn" },
  running: { text: "Generating", className: "chip-warn" },
  completed: { text: "Done", className: "chip-good" },
  failed: { text: "Failed", className: "chip-bad" },
};

export default function JobStatusChip({ status }: { status: string }) {
  const meta = LABELS[status] ?? { text: status, className: "chip-neutral" };

  return (
    <span className={`${meta.className} shrink-0`}>
      {status === "running" && (
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {meta.text}
    </span>
  );
}
