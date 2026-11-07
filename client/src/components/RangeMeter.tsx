import type { Status } from "../api.ts";
import { meterLayout } from "../meter.ts";

interface Props {
  value: number;
  low: number | null;
  high: number | null;
  status: Status;
}

/** A track with the printed range as a band and the value as a marker. Hidden from screen
 *  readers because the value, range and status word next to it already say the same thing. */
export function RangeMeter({ value, low, high, status }: Props) {
  const layout = meterLayout(value, low, high);
  if (!layout) return null;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <div className={`meter meter-${status}`} aria-hidden="true">
      <div className="meter-track">
        <span className="meter-band" style={{ left: pct(layout.bandStart), width: pct(layout.bandEnd - layout.bandStart) }} />
        <span className="meter-marker" style={{ left: pct(layout.marker) }} />
      </div>
      <div className="meter-scale">
        {low !== null && <span style={{ left: pct(layout.bandStart) }}>{low}</span>}
        {high !== null && <span style={{ left: pct(layout.bandEnd) }}>{high}</span>}
      </div>
    </div>
  );
}
