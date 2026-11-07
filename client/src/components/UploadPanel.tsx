import { useRef } from "react";
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, SAMPLES, type Sample } from "../constants.ts";

interface Props {
  busy: boolean;
  onFile: (file: File) => void;
  onSample: (sample: Sample) => void;
  onManual: () => void;
  onInvalid: (message: string) => void;
}

export function UploadPanel({ busy, onFile, onSample, onManual, onInvalid }: Props) {
  const input = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow choosing the same file again
    if (!file) return;
    // Quick checks for a friendly message; the server checks again (type by file signature).
    if (!ACCEPTED_TYPES.includes(file.type)) return onInvalid("Please choose a PDF, PNG, or JPG file.");
    if (file.size > MAX_UPLOAD_BYTES) return onInvalid("That file is larger than 5 MB.");
    onFile(file);
  }

  return (
    <section className="card" aria-labelledby="upload-heading">
      <h2 id="upload-heading">1. Add your results</h2>

      <div className="upload-options">
        <div>
          <h3>Try a sample report</h3>
          <p className="hint">Synthetic reports made for this demo.</p>
          <div className="button-row">
            {SAMPLES.map((s) => (
              <button key={s.file} type="button" disabled={busy} onClick={() => onSample(s)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3>Or upload a file</h3>
          <p className="hint">PDF, PNG, or JPG, up to 5 MB. Please do not upload a real report.</p>
          <input
            ref={input}
            id="report-file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            disabled={busy}
            onChange={handleChange}
            className="visually-hidden"
          />
          <button type="button" disabled={busy} onClick={() => input.current?.click()}>
            Choose file…
          </button>
        </div>

        <div>
          <h3>Or type values in</h3>
          <p className="hint">No AI is used for manual entry.</p>
          <button type="button" disabled={busy} onClick={onManual}>
            Enter values by hand
          </button>
        </div>
      </div>
    </section>
  );
}
