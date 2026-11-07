import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TOUR_STEPS } from "../tourSteps.ts";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8; // breathing room around the highlighted element
const GAP = 14; // space between the highlight and the dialog
const EDGE = 16; // minimum distance from the viewport edge
const SHEET_BELOW = 640; // under this width the dialog docks to the bottom as a sheet

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const findTarget = (id?: string) => (id ? document.querySelector<HTMLElement>(`[data-tour="${id}"]`) : null);

/** Places the dialog below, above, or beside the highlight, whichever fits first. */
function placeDialog(rect: Rect, w: number, h: number): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x: number) => Math.min(Math.max(x, EDGE), vw - w - EDGE);
  const clampY = (y: number) => Math.min(Math.max(y, EDGE), vh - h - EDGE);

  const below = rect.top + rect.height + GAP;
  if (below + h <= vh - EDGE) return { top: below, left: clampX(rect.left) };
  const above = rect.top - GAP - h;
  if (above >= EDGE) return { top: above, left: clampX(rect.left) };

  // Tall targets (like the example result) leave no room above or below, so use the side.
  const middle = clampY(rect.top + rect.height / 2 - h / 2);
  if (rect.left - GAP - w >= EDGE) return { top: middle, left: rect.left - GAP - w };
  if (rect.left + rect.width + GAP + w <= vw - EDGE) return { top: middle, left: rect.left + rect.width + GAP };
  return { top: vh - h - EDGE, left: clampX(rect.left) };
}

export function GuidedTour({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [placement, setPlacement] = useState<React.CSSProperties | undefined>(undefined);
  const dialog = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);

  const step = TOUR_STEPS[index] ?? TOUR_STEPS[0];
  const isFirst = index === 0;
  const isLast = index === TOUR_STEPS.length - 1;
  const next = useCallback(() => setIndex((i) => Math.min(i + 1, TOUR_STEPS.length - 1)), []);
  const back = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  const measure = useCallback(() => {
    const el = findTarget(step.target);
    if (!el) return setRect(null); // a missing target falls back to a centred dialog
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step.target]);

  // Bring the target into view and keep the highlight on it while the page scrolls or reflows
  // (for example when the "waking up the server" notice appears above it).
  useLayoutEffect(() => {
    const narrow = window.innerWidth < SHEET_BELOW;
    findTarget(step.target)?.scrollIntoView({
      // On phones the dialog is a bottom sheet, so the target goes to the top of the screen.
      block: narrow ? "start" : "center",
      // Instant on phones: under mobile emulation smooth scrolls sometimes stopped part-way,
      // leaving the target hidden under the sheet. A jump is better than a hidden target.
      behavior: narrow || prefersReducedMotion() ? "auto" : "smooth",
    });
    // No direct measure() call: a ResizeObserver reports once as soon as it starts observing,
    // before paint, which covers the first measurement.
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [step.target, measure]);

  useLayoutEffect(() => {
    const el = dialog.current;
    if (!rect || !el || window.innerWidth < SHEET_BELOW) return setPlacement(undefined);
    setPlacement(placeDialog(rect, el.offsetWidth, el.offsetHeight));
  }, [rect, index]);

  // While the tour is open the page behind it cannot be clicked or tabbed into.
  useEffect(() => {
    const root = document.getElementById("root");
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root?.setAttribute("inert", "");
    return () => {
      root?.removeAttribute("inert");
      returnFocus?.focus({ preventScroll: true });
    };
  }, []);

  // preventScroll: otherwise focusing the button would fight the smooth scroll to the target.
  useEffect(() => primary.current?.focus({ preventScroll: true }), [index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, next, back]);

  function trapFocus(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !dialog.current) return;
    const items = dialog.current.querySelectorAll<HTMLElement>("button");
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div className="tour">
      {rect ? (
        <div
          className="tour-spotlight"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          aria-hidden="true"
        />
      ) : (
        <div className="tour-backdrop" aria-hidden="true" />
      )}

      <div
        ref={dialog}
        key={index}
        className={`tour-dialog${rect ? "" : " tour-dialog-center"}${step.video ? " tour-dialog-wide" : ""}`}
        style={placement}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        onKeyDown={trapFocus}
      >
        <div className="tour-head">
          <span className="tour-count">
            {index + 1} / {TOUR_STEPS.length}
          </span>
          <button type="button" className="icon-button tour-close" aria-label="Close the tour" onClick={onClose}>
            <X className="icon" size={18} aria-hidden="true" />
          </button>
        </div>
        <h2 id="tour-title">{step.title}</h2>
        <p id="tour-body">{step.body}</p>
        {step.video && (
          // Muted so browsers allow autoplay; controls so it can be paused (WCAG 2.2.2).
          // No autoplay for people who ask for reduced motion: they press play themselves.
          <video
            className="tour-video"
            src={step.video.src}
            poster={step.video.poster}
            aria-label={step.video.label}
            width={960}
            height={600}
            autoPlay={!prefersReducedMotion()}
            muted
            loop
            playsInline
            controls
            preload="metadata"
          />
        )}

        <div className="tour-progress" aria-hidden="true">
          {TOUR_STEPS.map((s, i) => (
            <span key={s.title} className={i <= index ? "reached" : undefined} />
          ))}
        </div>

        <div className="tour-actions">
          {isFirst ? (
            <button type="button" className="text-button" onClick={onClose}>
              Skip tour
            </button>
          ) : (
            <button type="button" onClick={back}>
              <ArrowLeft className="icon" size={16} aria-hidden="true" />
              Back
            </button>
          )}
          <button ref={primary} type="button" className="primary" onClick={isLast ? onClose : next}>
            {isFirst ? "Show me around" : isLast ? "Start exploring" : "Next"}
            {!isLast && <ArrowRight className="icon" size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
