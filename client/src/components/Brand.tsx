// The mark is the range meter in miniature: a reference band with a reading marker on it,
// so the logo says what the product does ("Paimana" means "measure" in Hindi).
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" className="brand-mark-bg" />
      <path d="M6 21h20" className="brand-mark-track" />
      <path d="M10 21h11" className="brand-mark-band" />
      {/* A pointer resting on the scale, not a crossing line: a cross would read as a medical cross. */}
      <path d="M14 9.5h8l-4 6z" className="brand-mark-marker" />
    </svg>
  );
}

export function Brand() {
  return (
    <span className="brand">
      <BrandMark />
      Paimana
    </span>
  );
}
