import { ArrowDown, ArrowUp, Check, CircleHelp, type LucideIcon } from "lucide-react";
import type { Status } from "./api.ts";

// Icon + word + colour, so the status never depends on colour alone (WCAG 1.4.1).
export const STATUS_LOOK: Record<Status, { Icon: LucideIcon; label: string }> = {
  high: { Icon: ArrowUp, label: "High" },
  low: { Icon: ArrowDown, label: "Low" },
  normal: { Icon: Check, label: "In range" },
  unchecked: { Icon: CircleHelp, label: "Not checked" },
};
