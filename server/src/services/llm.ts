import { GoogleGenAI, type GenerateContentParameters, type GenerateContentResponse } from "@google/genai";
import type { Config } from "../config.js";
import { EXTRACTION_JSON_SCHEMA, EXTRACTION_SYSTEM_PROMPT } from "./prompts.js";

// Every Gemini call goes through this file (CLAUDE.md), so tests can swap in a fake and nothing
// else needs to know about the SDK. Nothing here logs prompts, files, or responses.

export interface UploadedFile {
  buffer: Buffer;
  mimeType: "application/pdf" | "image/png" | "image/jpeg";
}

export interface LlmClient {
  /** Returns the model's raw JSON text for the extraction schema. Callers must validate it. */
  extractRowsJson(file: UploadedFile): Promise<string>;
}

/** The provider is unreachable, timed out, or failed. Maps to HTTP 502. */
export class LlmUnavailableError extends Error {
  override name = "LlmUnavailableError";
}
/** Still rate-limited after retries (free-tier quota). Maps to HTTP 429. */
export class LlmQuotaError extends Error {
  override name = "LlmQuotaError";
}

type Generate = (params: GenerateContentParameters) => Promise<GenerateContentResponse>;

export interface GeminiOptions {
  /** Injected in tests; defaults to the real SDK call. */
  generate?: Generate;
  sleep?: (ms: number) => Promise<void>;
  /** Delays before each retry. Two retries: 1 s, then 3 s. */
  retryDelaysMs?: number[];
  timeoutMs?: number;
}

const RETRYABLE = new Set([429, 503]); // rate limited, or provider temporarily overloaded

export function createGeminiClient(
  config: Pick<Config, "GEMINI_API_KEY" | "GEMINI_MODEL">,
  options: GeminiOptions = {},
): LlmClient {
  const generate: Generate =
    options.generate ??
    ((params) => new GoogleGenAI({ apiKey: config.GEMINI_API_KEY }).models.generateContent(params));
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const delays = options.retryDelaysMs ?? [1000, 3000];
  const timeoutMs = options.timeoutMs ?? 45_000;

  async function withRetry(params: Omit<GenerateContentParameters, "model">): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await generate({
          ...params,
          model: config.GEMINI_MODEL,
          config: { ...params.config, abortSignal: AbortSignal.timeout(timeoutMs) },
        });
        const text = response.text;
        if (typeof text !== "string" || text.trim() === "") {
          throw new LlmUnavailableError("Model returned no text");
        }
        return text;
      } catch (err) {
        const status = statusOf(err);
        const delay = delays[attempt];
        if (status !== undefined && RETRYABLE.has(status) && delay !== undefined) {
          await sleep(delay);
          continue;
        }
        if (status === 429) throw new LlmQuotaError("Model rate limit reached");
        if (err instanceof LlmUnavailableError) throw err;
        // Do not wrap the original message: provider errors can echo request content.
        throw new LlmUnavailableError(`Model call failed (${status ?? (err instanceof Error ? err.name : "unknown")})`);
      }
    }
  }

  return {
    extractRowsJson(file) {
      return withRetry({
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: file.mimeType, data: file.buffer.toString("base64") } },
              { text: "Extract the result rows." },
            ],
          },
        ],
        config: {
          systemInstruction: EXTRACTION_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseJsonSchema: EXTRACTION_JSON_SCHEMA,
          temperature: 0,
          // Ask the API not to log this request. Free-tier inputs may still be used by Google
          // (see the pricing page), which is why the UI warns against real reports.
          store: false,
        },
      });
    },
  };
}

function statusOf(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null && "status" in err) {
    const status = (err as { status: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
}
