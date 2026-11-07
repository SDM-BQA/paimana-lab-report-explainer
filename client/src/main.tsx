import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted fonts: no request to a third-party font CDN, so visitors' IPs are not shared.
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/noto-sans-devanagari";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
