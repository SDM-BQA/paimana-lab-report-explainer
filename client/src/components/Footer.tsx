import { Brand } from "./Brand.tsx";

// Shown on every page, whatever the server returns.
export function Footer() {
  return (
    <footer className="footer">
      <Brand />
      <p>
        <strong>Not medical advice.</strong> Paimana does not diagnose conditions or suggest treatment. It compares values
        with the range printed on a report and shows general information. Always talk to a doctor about your results.
      </p>
      <p>Demo project. Nothing you enter is stored by Paimana.</p>
    </footer>
  );
}
