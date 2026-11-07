export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
export const MAX_ROWS = 60;

// Synthetic reports copied from fixtures/ into public/samples. Never real data.
export const SAMPLES = [
  { file: "report-01.pdf", type: "application/pdf", label: "All normal" },
  { file: "report-04.pdf", type: "application/pdf", label: "Mixed results" },
  { file: "report-09.pdf", type: "application/pdf", label: "Cholesterol panel" },
  { file: "report-02.png", type: "image/png", label: "Photo of a report" },
] as const;

export type Sample = (typeof SAMPLES)[number];
