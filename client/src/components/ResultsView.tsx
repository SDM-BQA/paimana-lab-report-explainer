import type { AnalyzeResponse, AnalyzeResult, Row, Status } from "../api.ts";
import { StatusBadge } from "./StatusBadge.tsx";

export type Language = "en" | "hi";

interface Props {
  analysis: AnalyzeResponse;
  /** The rows that were checked, to show the printed range next to each result. */
  rows: Row[];
  language: Language;
  busy: boolean;
  onLanguage: (language: Language) => void;
}

const ORDER: Status[] = ["high", "low", "unchecked", "normal"];
const SUMMARY_WORD: Record<Status, string> = { high: "high", low: "low", unchecked: "not checked", normal: "in range" };

export function ResultsView({ analysis, rows, language, busy, onLanguage }: Props) {
  const printedRange = new Map(rows.map((r) => [r.id, r.printedRange]));
  const counts = ORDER.map((s) => [s, analysis.results.filter((r) => r.status === s).length] as const).filter(([, n]) => n > 0);

  return (
    <section className="card" aria-labelledby="results-heading">
      <div className="results-header">
        <h2 id="results-heading">3. Results</h2>
        <div className="toggle" role="group" aria-label="Explanation language">
          <button type="button" aria-pressed={language === "en"} disabled={busy} onClick={() => onLanguage("en")}>
            English
          </button>
          <button type="button" aria-pressed={language === "hi"} disabled={busy} onClick={() => onLanguage("hi")} lang="hi">
            हिन्दी
          </button>
        </div>
      </div>

      <p className="summary" aria-live="polite">
        {busy ? "Updating…" : counts.map(([s, n]) => `${n} ${SUMMARY_WORD[s]}`).join(" · ")}
      </p>

      {analysis.warnings.length > 0 && (
        <ul className="warnings">
          {analysis.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <ol className="result-list">
        {analysis.results.map((r) => (
          <ResultCard key={r.id} result={r} printedRange={printedRange.get(r.id) ?? null} />
        ))}
      </ol>

      <p className="disclaimer">
        <strong>Important:</strong> {analysis.disclaimer}
      </p>
    </section>
  );
}

function ResultCard({ result, printedRange }: { result: AnalyzeResult; printedRange: string | null }) {
  const flagged = result.status === "high" || result.status === "low";
  const shownValue = result.value === null ? "—" : `${result.value}${result.unit ? ` ${result.unit}` : ""}`;

  return (
    <li className={`result result-${result.status}`}>
      <div className="result-top">
        <h3>{result.testName}</h3>
        <StatusBadge status={result.status} />
      </div>
      <dl className="result-facts">
        <div>
          <dt>Your result</dt>
          <dd>{shownValue}</dd>
        </div>
        <div>
          <dt>Range on report</dt>
          <dd>{printedRange ?? "—"}</dd>
        </div>
      </dl>

      {result.status === "unchecked" && (
        <p className="reason">
          <strong>Why not checked:</strong> {result.reason}.
        </p>
      )}

      {flagged && result.explanation && (
        <div className="explanation">
          <p lang={result.explanation.language}>{result.explanation.text}</p>
          <p className="hint">
            {result.explanation.origin === "rephrased"
              ? "Translated by AI from reviewed text, then safety-checked."
              : "From reviewed text based on MedlinePlus."}
          </p>
        </div>
      )}

      {flagged && !result.explanation && (
        <p className="hint">No explanation is available for this test yet. A doctor can tell you what it means for you.</p>
      )}
    </li>
  );
}
