import { useCallback, useEffect, useState } from "react";
import { checkHealth } from "./api.ts";

export type ServerState = "checking" | "waking" | "ready" | "down";

/** How long to wait before telling the user a sleeping server is starting up. */
const WAKING_AFTER_MS = 2500;

/**
 * Pings /api/health on page load. On Render's free tier the server sleeps after 15 minutes idle,
 * so the first request can take up to about a minute. Pinging early starts that wake-up while the
 * user is still choosing a file.
 */
export function useServerStatus(): { state: ServerState; retry: () => void } {
  const [state, setState] = useState<ServerState>("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Only async updates here; the "checking" state is set by the initial state or by retry().
    const timer = setTimeout(() => !cancelled && setState((s) => (s === "checking" ? "waking" : s)), WAKING_AFTER_MS);
    checkHealth()
      .then(() => !cancelled && setState("ready"))
      .catch(() => !cancelled && setState("down"))
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState("checking");
    setAttempt((a) => a + 1);
  }, []);
  return { state, retry };
}
