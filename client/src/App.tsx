import { useRef, useState } from "react";
import { analyzeRows, ApiError, extractReport, type AnalyzeResponse, type Row } from "./api.ts";
import { Banner } from "./components/Banner.tsx";
import { Footer } from "./components/Footer.tsx";
import { ResultsView, type Language } from "./components/ResultsView.tsx";
import { RowsTable } from "./components/RowsTable.tsx";
import { ServerStatus } from "./components/ServerStatus.tsx";
import { UploadPanel } from "./components/UploadPanel.tsx";
import { MAX_ROWS, type Sample } from "./constants.ts";
import { useServerStatus } from "./useServerStatus.ts";

type Busy = null | "reading" | "checking";

const emptyRow = (id: string): Row => ({ id, testName: "", rawValue: null, unit: null, printedRange: null });
const orNull = (text: string) => (text.trim() === "" ? null : text);

export default function App() {
  const server = useServerStatus();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  // The exact rows that produced `analysis`, so a language switch re-checks the same data.
  const [checkedRows, setCheckedRows] = useState<Row[]>([]);
  const [language, setLanguage] = useState<Language>("en");
  const nextId = useRef(1);
  const newId = () => `m${nextId.current++}`;

  function startReview(newRows: Row[], from: string, newWarnings: string[] = []) {
    setRows(newRows);
    setSource(from);
    setWarnings(newWarnings);
    setAnalysis(null);
    setError(null);
  }

  async function readFile(file: File, label: string) {
    setBusy("reading");
    setError(null);
    setAnalysis(null);
    try {
      const out = await extractReport(file);
      startReview(out.rows.length > 0 ? out.rows : [emptyRow(newId())], label, out.warnings);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong while reading the report.");
    } finally {
      setBusy(null);
    }
  }

  async function readSample(sample: Sample) {
    try {
      const res = await fetch(`/samples/${sample.file}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      await readFile(new File([blob], sample.file, { type: sample.type }), `Sample: ${sample.label}`);
    } catch {
      setError("Could not load the sample report.");
    }
  }

  function updateRow(id: string, field: "testName" | "rawValue" | "unit" | "printedRange", text: string) {
    setAnalysis(null); // results would be stale after an edit
    setRows((current) =>
      (current ?? []).map((r) => (r.id !== id ? r : { ...r, [field]: field === "testName" ? text : orNull(text) })),
    );
  }

  async function runAnalysis(toCheck: Row[], lang: Language) {
    setBusy("checking");
    setError(null);
    try {
      setAnalysis(await analyzeRows(toCheck, lang));
      setCheckedRows(toCheck);
      setLanguage(lang);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong while checking the values.");
    } finally {
      setBusy(null);
    }
  }

  function check() {
    if (!rows) return;
    const filled = rows.filter((r) => r.testName.trim() !== "" || r.rawValue !== null);
    if (filled.length === 0) return setError("Add at least one test name and result first.");
    if (filled.some((r) => r.testName.trim() === "")) return setError("Every row with a result needs a test name.");
    void runAnalysis(
      filled.map((r) => ({ ...r, testName: r.testName.trim() })),
      language,
    );
  }

  return (
    <>
      <Banner />
      <main className="container">
        <header>
          <h1>Paimana</h1>
          <p className="lead">
            Upload a lab report or type values in. Plain code (not AI) checks each value against the range printed on the
            report, and explains flagged results in simple words.
          </p>
        </header>

        <ServerStatus state={server.state} retry={server.retry} />

        <UploadPanel
          busy={busy !== null}
          onFile={(file) => readFile(file, "Your file")}
          onSample={readSample}
          onManual={() => startReview([emptyRow(newId())], "Manual entry")}
          onInvalid={setError}
        />

        {busy === "reading" && (
          <p className="notice" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" /> Reading the report. This usually takes a few seconds.
          </p>
        )}

        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}

        {rows && (
          <section className="card" aria-labelledby="review-heading">
            <h2 id="review-heading">2. Review the values</h2>
            <p className="hint">
              {source}. The AI can misread a digit, so please compare each row with the report and fix anything that is
              wrong. Only what is in this table gets checked.
            </p>
            {warnings.length > 0 && (
              <ul className="warnings">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
            <RowsTable
              rows={rows}
              busy={busy !== null}
              onChange={updateRow}
              onRemove={(id) => {
                setAnalysis(null);
                setRows((current) => (current ?? []).filter((r) => r.id !== id));
              }}
              onAdd={() => setRows((current) => [...(current ?? []), emptyRow(newId())].slice(0, MAX_ROWS))}
            />
            <div className="actions">
              <button type="button" className="primary" disabled={busy !== null || rows.length === 0} onClick={check}>
                {busy === "checking" ? "Checking…" : "Check these values"}
              </button>
            </div>
          </section>
        )}

        {analysis && (
          <ResultsView
            analysis={analysis}
            rows={checkedRows}
            language={language}
            busy={busy !== null}
            onLanguage={(lang) => lang !== language && void runAnalysis(checkedRows, lang)}
          />
        )}
      </main>
      <Footer />
    </>
  );
}
