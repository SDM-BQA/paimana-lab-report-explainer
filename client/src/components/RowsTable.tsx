import type { Row } from "../api.ts";
import { MAX_ROWS } from "../constants.ts";

type EditableField = "testName" | "rawValue" | "unit" | "printedRange";

interface Props {
  rows: Row[];
  busy: boolean;
  onChange: (id: string, field: EditableField, value: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

const COLUMNS: { field: EditableField; label: string; placeholder: string }[] = [
  { field: "testName", label: "Test", placeholder: "e.g. Hemoglobin" },
  { field: "rawValue", label: "Result", placeholder: "e.g. 13.5" },
  { field: "unit", label: "Unit", placeholder: "e.g. g/dL" },
  { field: "printedRange", label: "Reference range", placeholder: "e.g. 13.0 - 17.0" },
];

/** Every cell is editable, because the AI can misread a digit. What you see here is what gets checked. */
export function RowsTable({ rows, busy, onChange, onRemove, onAdd }: Props) {
  return (
    <div className="table-wrap">
      <table className="rows-table">
        <caption className="visually-hidden">Lab results to check. Every cell can be edited.</caption>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.field} scope="col">
                {c.label}
              </th>
            ))}
            <th scope="col">
              <span className="visually-hidden">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id}>
              {COLUMNS.map((c) => (
                <td key={c.field} data-label={c.label}>
                  <input
                    type="text"
                    value={row[c.field] ?? ""}
                    placeholder={c.placeholder}
                    maxLength={c.field === "unit" ? 40 : 120}
                    disabled={busy}
                    aria-label={`${c.label}, row ${i + 1}`}
                    onChange={(e) => onChange(row.id, c.field, e.target.value)}
                  />
                </td>
              ))}
              <td>
                <button
                  type="button"
                  className="icon-button"
                  disabled={busy}
                  onClick={() => onRemove(row.id)}
                  aria-label={`Remove row ${i + 1}${row.testName ? ` (${row.testName})` : ""}`}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" disabled={busy || rows.length >= MAX_ROWS} onClick={onAdd}>
        + Add row
      </button>
      {rows.length >= MAX_ROWS && <p className="hint">You can check up to {MAX_ROWS} rows at a time.</p>}
    </div>
  );
}
