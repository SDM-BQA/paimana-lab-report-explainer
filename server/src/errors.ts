import type { ErrorRequestHandler, RequestHandler } from "express";

/** An error that is safe to show to the client as-is. */
export class HttpError extends Error {
  override name = "HttpError";
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found" });
};

// Every error leaves as { error }. Only the error type and status are logged, never the
// request body or the error message, because messages can echo user input.
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  const status = statusOf(err);
  const name = err instanceof Error ? err.name : typeof err;
  console.error(`[error] ${status} ${name}`);

  const message =
    err instanceof HttpError ? err.message : status < 500 ? "Bad request" : "Internal server error";
  res.status(status).json({ error: message });
};

function statusOf(err: unknown): number {
  // body-parser and other middleware attach a numeric `status` to client errors.
  if (typeof err === "object" && err !== null && "status" in err) {
    const status = (err as { status: unknown }).status;
    if (typeof status === "number" && status >= 400 && status < 600) return status;
  }
  return 500;
}
