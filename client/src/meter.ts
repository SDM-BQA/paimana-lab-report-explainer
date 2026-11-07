// Geometry for the range meter. Pure display: the flag itself always comes from the server's
// range engine, this only places a marker on a track so people can see *where* a value sits.

export interface MeterLayout {
  /** Start and end of the printed reference band, as fractions of the track (0 to 1). */
  bandStart: number;
  bandEnd: number;
  /** Marker position as a fraction of the track, clamped so it never falls off the edge. */
  marker: number;
}

const clamp = (n: number) => Math.min(0.97, Math.max(0.03, n));

export function meterLayout(value: number, low: number | null, high: number | null): MeterLayout | null {
  if (low !== null && high !== null) {
    const span = high - low;
    if (!(span > 0)) return null;
    // Half a band of headroom on each side, so the band fills the middle 50% of the track.
    return { bandStart: 0.25, bandEnd: 0.75, marker: clamp(0.25 + ((value - low) / span) * 0.5) };
  }
  // One-sided ranges ("< 200", "> 40") are drawn from zero, so they need positive bounds and values.
  if (high !== null && high > 0 && value >= 0) {
    return { bandStart: 0, bandEnd: 0.65, marker: clamp((value / high) * 0.65) };
  }
  if (low !== null && low > 0 && value >= 0) {
    return { bandStart: 0.35, bandEnd: 1, marker: clamp((value / low) * 0.35) };
  }
  return null;
}
