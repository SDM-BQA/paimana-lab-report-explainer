// Generates fixtures/reports/NN.pdf and fixtures/truth/NN.json from fixtureSpec.ts.
// Run: cd server && npm run fixtures
// Output is deterministic (fixed dates, fixed metadata) so regenerating gives identical files.

import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import { FIXTURES, type Fixture } from "./fixtureSpec.js";

const ROOT = fileURLToPath(new URL("../../fixtures/", import.meta.url));
const REPORTS = `${ROOT}reports/`;
const TRUTH = `${ROOT}truth/`;
const FIXED_DATE = new Date("2026-01-01T00:00:00Z");

const COLUMNS = [
  { header: "Test", x: 50, width: 190 },
  { header: "Result", x: 245, width: 80 },
  { header: "Unit", x: 330, width: 80 },
  { header: "Reference range", x: 415, width: 130 },
] as const;

function writePdf(fixture: Fixture, path: string): Promise<void> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    info: {
      Title: `Paimana synthetic report ${fixture.id}`,
      Author: "Paimana fixtures generator",
      Producer: "Paimana fixtures generator",
      Creator: "Paimana fixtures generator",
      CreationDate: FIXED_DATE,
      ModDate: FIXED_DATE,
    },
  });
  const done = new Promise<void>((resolve, reject) => {
    const out = createWriteStream(path);
    out.on("finish", resolve);
    out.on("error", reject);
    doc.pipe(out);
  });

  doc.font("Helvetica-Bold").fontSize(16).text("Paimana Sample Lab", 50, 50);
  doc.font("Helvetica").fontSize(9).fillColor("#b00020")
    .text("SYNTHETIC TEST REPORT - NOT A REAL PERSON - FOR SOFTWARE TESTING ONLY", 50, 72);
  doc.fillColor("black").font("Helvetica-Bold").fontSize(12).text(fixture.title, 50, 100);

  let y = 130;
  doc.font("Helvetica-Bold").fontSize(10);
  for (const col of COLUMNS) doc.text(col.header, col.x, y, { width: col.width });
  y += 16;
  doc.moveTo(50, y).lineTo(545, y).stroke();
  y += 8;

  doc.font("Helvetica").fontSize(10);
  for (const row of fixture.rows) {
    const cells = [row.testName, row.rawValue, row.unit ?? "", row.printedRange ?? ""];
    COLUMNS.forEach((col, i) => doc.text(cells[i] ?? "", col.x, y, { width: col.width }));
    y += 20;
  }

  if (fixture.injectedText) {
    y += 16;
    doc.font("Helvetica-Oblique").fontSize(9).text(fixture.injectedText, 50, y, { width: 495 });
  }

  doc.font("Helvetica").fontSize(8).fillColor("#555555")
    .text("Generated test document. Values are invented. Not medical information.", 50, 780);
  doc.end();
  return done;
}

function truthFor(fixture: Fixture) {
  return {
    id: fixture.id,
    case: fixture.case,
    file: `reports/${fixture.id}.pdf`,
    rows: fixture.rows,
    ...(fixture.injectedText ? { injectedText: fixture.injectedText } : {}),
  };
}

mkdirSync(REPORTS, { recursive: true });
mkdirSync(TRUTH, { recursive: true });
for (const fixture of FIXTURES) {
  await writePdf(fixture, `${REPORTS}${fixture.id}.pdf`);
  writeFileSync(`${TRUTH}${fixture.id}.json`, JSON.stringify(truthFor(fixture), null, 2) + "\n");
}
console.log(`Wrote ${FIXTURES.length} reports and truth files to ${ROOT}`);
