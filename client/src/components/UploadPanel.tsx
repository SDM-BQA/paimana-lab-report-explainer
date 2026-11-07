import { ArrowRight, FileImage, FileText, PencilLine, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, SAMPLES, type Sample } from "../constants.ts";
import { StepTitle } from "./StepTitle.tsx";

interface Props {
  busy: boolean;
  onFile: (file: File) => void;
  onSample: (sample: Sample) => void;
  onManual: () => void;
  onInvalid: (message: string) => void;
}

export function UploadPanel({ busy, onFile, onSample, onManual, onInvalid }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function accept(file: File | undefined) {
    if (!file) return;
    // Quick checks for a friendly message; the server checks again (type by file signature).
    if (!ACCEPTED_TYPES.includes(file.type)) return onInvalid("Please choose a PDF, PNG, or JPG file.");
    if (file.size > MAX_UPLOAD_BYTES) return onInvalid("That file is larger than 5 MB.");
    onFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow choosing the same file again
    accept(file);
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setDragging(false);
    if (!busy) accept(e.dataTransfer.files[0]);
  }

  return (
    <section className="card" aria-labelledby="upload-heading">
      <div className="card-header">
        <StepTitle id="upload-heading" step={1}>
          Add your results
        </StepTitle>
      </div>

      <div className="upload-grid">
        {/* Samples come first and get the most room: this is a demo, and they are the safe path. */}
        <div className="samples">
          <h3>Try a sample report</h3>
          <p className="hint">Synthetic reports made for this demo. Pick one to see the whole flow.</p>
          <ul className="sample-list">
            {SAMPLES.map((s) => {
              const isPdf = s.type === "application/pdf";
              const Icon = isPdf ? FileText : FileImage;
              return (
                <li key={s.file}>
                  <button type="button" className="sample-button" disabled={busy} onClick={() => onSample(s)}>
                    <Icon className="icon" size={18} aria-hidden="true" />
                    <span className="sample-label">{s.label}</span>
                    <span className="file-tag">{isPdf ? "PDF" : "PNG"}</span>
                    <ArrowRight className="icon sample-arrow" size={16} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="own-input">
          <input
            ref={input}
            id="report-file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            disabled={busy}
            onChange={handleChange}
            className="visually-hidden"
          />
          <button
            type="button"
            className={`dropzone${dragging ? " dragging" : ""}`}
            disabled={busy}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <Upload className="icon" size={24} aria-hidden="true" />
            <span className="dropzone-title">
              <strong>Choose a file</strong> or drag it here
            </span>
            <span className="dropzone-meta">PDF, PNG or JPG · up to 5 MB</span>
          </button>
          <p className="hint upload-warning">Please do not upload a real report.</p>

          <div className="divider" role="presentation">
            <span>or</span>
          </div>

          <button type="button" className="manual-button" disabled={busy} onClick={onManual}>
            <PencilLine className="icon" size={18} aria-hidden="true" />
            <span>
              <strong>Type values in by hand</strong>
              <span className="manual-meta">No AI is used for manual entry</span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
