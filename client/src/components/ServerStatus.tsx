import { CircleAlert, LoaderCircle } from "lucide-react";
import type { ServerState } from "../useServerStatus.ts";

export function ServerStatus({ state, retry }: { state: ServerState; retry: () => void }) {
  if (state === "ready" || state === "checking") return null;
  if (state === "waking") {
    return (
      <p className="notice" role="status" aria-live="polite">
        <LoaderCircle className="icon spin" size={18} aria-hidden="true" />
        <span>Waking up the server. The free server sleeps when idle, so this can take up to a minute.</span>
      </p>
    );
  }
  return (
    <p className="notice notice-error" role="alert">
      <CircleAlert className="icon" size={18} aria-hidden="true" />
      <span>
        Could not reach the server. You can still try, or{" "}
        <button type="button" className="link-button" onClick={retry}>
          check again
        </button>
        .
      </span>
    </p>
  );
}
