// All calls to the Paimana API. The base URL comes from VITE_API_URL, which is public by nature:
// it is baked into the browser bundle, so never put a secret in a VITE_ variable.

export interface Row {
  id: string;
  testName: string;
  rawValue: string | null;
  value?: number | null;
  unit: string | null;
  printedRange: string | null;
}

export interface ExtractResponse {
  rows: Row[];
  warnings: string[];
}

export type Status = "low" | "normal" | "high" | "unchecked";

export interface AnalyzeResult {
  id: string;
  testName: string;
  canonicalKey: string | null;
  value: number | null;
  unit: string | null;
  status: Status;
  range: { low: number | null; high: number | null } | null;
  reason: string;
  explanation: { text: string; language: "en" | "hi"; origin: "curated" | "rephrased" } | null;
}

export interface AnalyzeResponse {
  results: AnalyzeResult[];
  warnings: string[];
  disclaimer: string;
}

function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL as string | undefined;
  if (configured) return configured.replace(/\/+$/, "");
  // Fail loudly in a production build instead of silently calling localhost.
  if (import.meta.env.PROD) throw new Error("VITE_API_URL is not set for this build.");
  return "http://localhost:5000";
}

export const API_URL = apiBaseUrl();

/** An error whose message is safe and helpful to show to the user. */
export class ApiError extends Error {
  // A plain field: constructor parameter properties are not allowed with erasableSyntaxOnly.
  readonly status: number | null;
  constructor(message: string, status: number | null) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 90_000): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    throw new ApiError(
      timedOut ? "The server took too long to answer. Please try again." : "Could not reach the server. Check your connection and try again.",
      null,
    );
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : `Request failed (${res.status}).`;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export function checkHealth(): Promise<{ status: string }> {
  // Long timeout: a sleeping free Render instance can take about a minute to wake up.
  return request("/api/health", {}, 75_000);
}

export function extractReport(file: File): Promise<ExtractResponse> {
  const form = new FormData();
  form.append("report", file);
  return request("/api/extract", { method: "POST", body: form });
}

export function analyzeRows(rows: Row[], language: "en" | "hi"): Promise<AnalyzeResponse> {
  // value is left out on purpose: the server recomputes it from rawValue (D10).
  const payload = rows.map(({ id, testName, rawValue, unit, printedRange }) => ({ id, testName, rawValue, unit, printedRange }));
  return request("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ language, rows: payload }),
  });
}
