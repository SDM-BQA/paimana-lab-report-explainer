export function StepTitle({ id, step, children }: { id: string; step: number; children: React.ReactNode }) {
  return (
    <h2 id={id} className="step-title">
      <span className="step-number" aria-hidden="true">
        {String(step).padStart(2, "0")}
      </span>
      <span>
        <span className="visually-hidden">Step {step}: </span>
        {children}
      </span>
    </h2>
  );
}
