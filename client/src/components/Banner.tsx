import { TriangleAlert } from "lucide-react";

export function Banner() {
  return (
    <div className="banner" role="alert">
      <TriangleAlert className="icon" size={18} aria-hidden="true" />
      <p>
        <strong>Demo only. Use the sample reports, not real medical data.</strong> Files are read by a free AI service that
        may use inputs to improve its products. Nothing is stored by Paimana. This is not medical advice.
      </p>
    </div>
  );
}
