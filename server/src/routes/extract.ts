import { Router, type RequestHandler } from "express";
import multer from "multer";
import { HttpError } from "../errors.js";
import { extractRows, LlmOutputError } from "../services/extraction.js";
import { LlmQuotaError, LlmUnavailableError, type LlmClient, type UploadedFile } from "../services/llm.js";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/png", "image/jpeg"] as const;
type AllowedType = (typeof ALLOWED)[number];

// memoryStorage: the file lives only in RAM as a Buffer for this request and is never written to
// disk (CLAUDE.md hard rule 4). It is gone when the request ends.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 0, parts: 2 },
  fileFilter: (_req, file, cb) => cb(null, (ALLOWED as readonly string[]).includes(file.mimetype)),
}).single("report");

// Turns multer's errors (which carry the client file name) into plain 400s.
const receiveFile: RequestHandler = (req, res, next) => {
  upload(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return next(new HttpError(400, "File is larger than 5 MB."));
    }
    return next(new HttpError(400, "Upload one PDF, PNG, or JPG file in the 'report' field."));
  });
};

export function extractRouter(llm: LlmClient): Router {
  const router = Router();

  router.post("/", receiveFile, async (req, res) => {
    if (!req.file) throw new HttpError(400, "Please upload a PDF, PNG, or JPG file.");
    const mimeType = sniffType(req.file.buffer);
    // The browser-supplied type is untrusted; the file's first bytes must agree with it.
    if (mimeType === null || mimeType !== req.file.mimetype) {
      throw new HttpError(400, "The file does not look like a PDF, PNG, or JPG.");
    }
    const file: UploadedFile = { buffer: req.file.buffer, mimeType };

    try {
      res.json(await extractRows(llm, file));
    } catch (err) {
      if (err instanceof LlmQuotaError) {
        throw new HttpError(429, "The report reader is busy. Please try again in a minute, or enter values by hand.");
      }
      if (err instanceof LlmUnavailableError || err instanceof LlmOutputError) {
        throw new HttpError(502, "Could not read the report. Please try again, or enter values by hand.");
      }
      throw err;
    }
  });

  return router;
}

/** Identifies the file by its signature ("magic bytes"), not by its name or declared type. */
export function sniffType(buffer: Buffer): AllowedType | null {
  if (buffer.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  return null;
}
