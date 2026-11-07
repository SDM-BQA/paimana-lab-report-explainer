import { BookOpen, Info, Languages, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";
import type { AnalyzeResponse, AnalyzeResult, Row, Status } from "../api.ts";
import { STATUS_LOOK } from "../statusLook.ts";
import { StatusBadge } from "./StatusBadge.tsx";
import { StepTitle } from "./StepTitle.tsx";

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
      <div className="card-header">
        <StepTitle id="results-heading" step={3}>
          Results
        </StepTitle>
        <div className="toggle" role="group" aria-label="Explanation language">
          <Languages className="icon" size={16} aria-hidden="true" />
          <button type="button" aria-pressed={language === "en"} disabled={busy} onClick={() => onLanguage("en")}>
            English
          </button>
          <button type="button" aria-pressed={language === "hi"} disabled={busy} onClick={() => onLanguage("hi")} lang="hi">
            हिन्दी
          </button>
        </div>
      </div>

      <div className="summary" aria-live="polite">
        {busy ? (
          <span className="stat stat-unchecked">
            <LoaderCircle className="icon spin" size={16} aria-hidden="true" /> Updating…
          </span>
        ) : (
          counts.map(([s, n]) => {
            const { Icon } = STATUS_LOOK[s];
            return (
              <span key={s} className={`stat stat-${s}`}>
                <Icon className="icon" size={16} strokeWidth={2.75} aria-hidden="true" />
                <strong>{n}</strong> {SUMMARY_WORD[s]}
              </span>
            );
          })
        )}
      </div>

      {analysis.warnings.length > 0 && (
        <ul className="warnings">
          {analysis.warnings.map((w) => (
            <li key={w}>
              <TriangleAlert className="icon" size={16} aria-hidden="true" />
              {w}
            </li>
          ))}
        </ul>
      )}

      <ol className="result-list">
        {analysis.results.map((r) => (
          <ResultCard key={r.id} result={r} printedRange={printedRange.get(r.id) ?? null} />
        ))}
      </ol>

      <p className="disclaimer">
        <Info className="icon" size={18} aria-hidden="true" />
        <span>
          <strong>Important:</strong> {analysis.disclaimer}
        </span>
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
          <Info className="icon" size={16} aria-hidden="true" />
          <span>
            <strong>Why not checked:</strong> {result.reason}.
          </span>
        </p>
      )}

      {flagged && result.explanation && (
        <div className="explanation">
          <p lang={result.explanation.language}>{result.explanation.text}</p>
          <p className="source-note">
            {result.explanation.origin === "rephrased" ? (
              <>
                <ShieldCheck className="icon" size={14} aria-hidden="true" />
                Translated by AI from reviewed text, then safety-checked.
              </>
            ) : (
              <>
                <BookOpen className="icon" size={14} aria-hidden="true" />
                From reviewed text based on MedlinePlus.
              </>
            )}
          </p>
        </div>
      )}

      {flagged && !result.explanation && (
        <p className="reason">
          <Info className="icon" size={16} aria-hidden="true" />
          <span>No explanation is available for this test yet. A doctor can tell you what it means for you.</span>
        </p>
      )}
    </li>
  );
}
