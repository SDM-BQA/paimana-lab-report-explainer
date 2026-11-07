import type { Status } from "../api.ts";

// Symbol + word + colour, so the status never depends on colour alone (WCAG 1.4.1).
const LOOK: Record<Status, { symbol: string; label: string }> = {
  high: { symbol: "▲", label: "High" },
  low: { symbol: "▼", label: "Low" },
  normal: { symbol: "✓", label: "In range" },
  unchecked: { symbol: "?", label: "Not checked" },
};

export function StatusBadge({ status }: { status: Status }) {
  const { symbol, label } = LOOK[status];
  return (
    <span className={`badge badge-${status}`}>
      <span aria-hidden="true">{symbol}</span> {label}
    </span>
  );
}
