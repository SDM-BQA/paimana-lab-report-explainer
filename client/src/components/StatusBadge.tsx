import type { Status } from "../api.ts";
import { STATUS_LOOK } from "../statusLook.ts";

export function StatusBadge({ status }: { status: Status }) {
  const { Icon, label } = STATUS_LOOK[status];
  return (
    <span className={`badge badge-${status}`}>
      <Icon className="icon" size={14} strokeWidth={2.75} aria-hidden="true" /> {label}
    </span>
  );
}
