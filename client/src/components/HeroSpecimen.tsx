import type { Status } from "../api.ts";
import { RangeMeter } from "./RangeMeter.tsx";
import { StatusBadge } from "./StatusBadge.tsx";

// Synthetic values only (hard rule 3). This previews what the results look like, using the same
// meter and badge components as the real results, so the preview can never drift from the product.
const EXAMPLE: { name: string; value: number; unit: string; printed: string; low: number | null; high: number | null; status: Status }[] = [
  { name: "Hemoglobin", value: 11.2, unit: "g/dL", printed: "12.0 – 15.5", low: 12, high: 15.5, status: "low" },
  { name: "Fasting glucose", value: 92, unit: "mg/dL", printed: "70 – 100", low: 70, high: 100, status: "normal" },
  { name: "Total cholesterol", value: 228, unit: "mg/dL", printed: "< 200", low: null, high: 200, status: "high" },
];

export function HeroSpecimen() {
  return (
    <figure className="specimen">
      <figcaption>
        <span>Example result</span>
        <span className="file-tag">Synthetic</span>
      </figcaption>
      <ul>
        {EXAMPLE.map((row) => (
          <li key={row.name}>
            <div className="specimen-row">
              <span className="specimen-name">{row.name}</span>
              <StatusBadge status={row.status} />
            </div>
            <div className="specimen-row">
              <span className="reading">
                {row.value}
                <span className="unit"> {row.unit}</span>
              </span>
              <span className="printed-range">Range {row.printed}</span>
            </div>
            <RangeMeter value={row.value} low={row.low} high={row.high} status={row.status} />
          </li>
        ))}
      </ul>
    </figure>
  );
}
