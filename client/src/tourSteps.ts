// Content for the first-visit tour. Targets are `data-tour` attributes in the page, so the tour
// does not depend on class names that styling might change. A step without a target is a
// centred dialog. The text describes how the app works and never makes a medical claim.

export interface TourStep {
  target?: string;
  title: string;
  body: string;
  /** A short screen recording, shown in a wider centred dialog. */
  video?: { src: string; poster: string; label: string };
}

// A non-empty tuple type, so the first step is always defined.
export const TOUR_STEPS: [TourStep, ...TourStep[]] = [
  {
    title: "Welcome to Paimana",
    body: "Paimana compares the values on a lab report with the range printed on that report, and explains them in plain words. This tour takes under a minute.",
  },
  {
    title: "See it in action",
    body: "A synthetic sample report is read, reviewed, checked, then explained in English and Hindi. The waits for the AI are cut out.",
    video: {
      src: "/guide/paimana-guide.mp4",
      poster: "/guide/paimana-guide-poster.jpg",
      label: "Screen recording of Paimana checking a synthetic sample report. No sound.",
    },
  },
  {
    target: "banner",
    title: "This is a demo",
    body: "Please use the sample reports. Uploaded files are read by a free AI service, so never upload a real report.",
  },
  {
    target: "principles",
    title: "Code decides, not AI",
    body: "AI only reads the document. Plain code compares each value with the printed range, explanations come from reviewed text, and nothing you enter is stored.",
  },
  {
    target: "specimen",
    title: "How to read a result",
    body: "The shaded band is the range printed on the report and the marker is the value. Every result also says High, Low or In range in words.",
  },
  {
    target: "samples",
    title: "Start with a sample",
    body: "Pick a synthetic report to see the whole flow: the values are read, you review them, then they are checked.",
  },
  {
    target: "own-input",
    title: "Or bring your own values",
    body: "You can also upload a PDF or image, or type values in by hand. Manual entry uses no AI at all.",
  },
];

// Only a "seen" flag is stored, never report data. Storage can be blocked (private mode,
// strict settings), so every access is guarded and the tour simply shows again if it fails.
const SEEN_KEY = "paimana.tourSeen";

export function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTourSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Not fatal: the tour shows again next visit.
  }
}
