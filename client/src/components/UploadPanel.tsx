import { FileImage, FileText, FlaskConical, Keyboard, PencilLine, Upload } from "lucide-react";
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

      <div className="upload-options">
        <div className="option">
          <span className="option-icon" aria-hidden="true">
            <FlaskConical size={20} />
          </span>
          <h3>Try a sample report</h3>
          <p className="hint">Synthetic reports made for this demo.</p>
          <div className="sample-list">
            {SAMPLES.map((s) => {
              const Icon = s.type === "application/pdf" ? FileText : FileImage;
              return (
                <button key={s.file} type="button" className="sample-button" disabled={busy} onClick={() => onSample(s)}>
                  <Icon className="icon" size={16} aria-hidden="true" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="option">
          <span className="option-icon" aria-hidden="true">
            <Upload size={20} />
          </span>
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
            <Upload className="icon" size={22} aria-hidden="true" />
            <span>
              <strong>Choose a file</strong> or drag it here
            </span>
          </button>
        </div>

        <div className="option">
          <span className="option-icon" aria-hidden="true">
            <Keyboard size={20} />
          </span>
          <h3>Or type values in</h3>
          <p className="hint">No AI is used for manual entry.</p>
          <button type="button" disabled={busy} onClick={onManual}>
            <PencilLine className="icon" size={16} aria-hidden="true" />
            Enter values by hand
          </button>
        </div>
      </div>
    </section>
  );
}
