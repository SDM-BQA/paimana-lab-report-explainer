import { Activity } from "lucide-react";

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        <Activity size={20} strokeWidth={2.5} />
      </span>
      Paimana
    </span>
  );
}
