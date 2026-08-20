import { describe, expect, test } from "bun:test";
import { fillWorkdays } from "../src/core/grid.ts";
import { pdfFilename, renderReportPdf } from "../src/pdf/report.tsx";
import { context } from "./fixtures.ts";
import { extractPdfText } from "./pdf-text.ts";

const august = context({
  report: {
    year: 2026,
    month: 8,
    status: "completed",
    days: { "3": 1, "4": 1, "5": 0.5 },
    dayNotes: { "3": "Kickoff workshop" },
    note: "Invoiced on the 1st of September.",
    privateNote: "Client was slow to pay in July.",
  },
});

describe("renderReportPdf", () => {
  test("produces a valid, non-trivial PDF", async () => {
    const pdf = await renderReportPdf(august);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.subarray(-6).toString()).toContain("EOF");
    expect(pdf.byteLength).toBeGreaterThan(2000);
  });

  test("states the period, the parties and the mission", async () => {
    const text = extractPdfText(await renderReportPdf(august));
    expect(text).toContain("Activity Report");
    expect(text).toContain("AUGUST 2026"); // the period is set in caps
    expect(text).toContain("Acme Consulting");
    expect(text).toContain("Globex");
    expect(text).toContain("API rewrite");
  });

  test("shows the total in days", async () => {
    const text = extractPdfText(await renderReportPdf(august));
    expect(text).toContain("Total : 2.5 days");
  });

  test("uses the singular day unit for a one-day month", async () => {
    const single = context({ report: { days: { "3": 1 } } });
    expect(extractPdfText(await renderReportPdf(single))).toContain("Total : 1 day");
  });

  test("lists every day of the month", async () => {
    const text = extractPdfText(await renderReportPdf(august));
    expect(text).toContain("03/08/2026");
    expect(text).toContain("31/08/2026");
  });

  test("carries day notes and the client note", async () => {
    const text = extractPdfText(await renderReportPdf(august));
    expect(text).toContain("Kickoff workshop");
    expect(text).toContain("Invoiced on the 1st of September.");
  });

  test("never leaks the private note", async () => {
    const text = extractPdfText(await renderReportPdf(august));
    expect(text).not.toContain("Client was slow to pay");
  });

  test("names public holidays from the client's country", async () => {
    const july = context({ report: { year: 2026, month: 7, days: fillWorkdays(2026, 7, "FR") } });
    const text = extractPdfText(await renderReportPdf(july, "en"));
    expect(text).toContain("Bastille Day");
  });

  test("translates the whole document", async () => {
    const text = extractPdfText(await renderReportPdf(august, "fr"));
    expect(text).toContain("Compte Rendu d'Activité");
    expect(text).toContain("AOÛT 2026"); // the period is set in caps
    expect(text).toContain("ÉMIS PAR");
    expect(text).toContain("Total : 2.5 jours");
    expect(text).toContain("Lun"); // localized weekday
    expect(text).not.toContain("Activity Report");
  });

  test("renders a month with no days worked", async () => {
    const empty = context({ report: { days: {}, dayNotes: {}, note: null } });
    const text = extractPdfText(await renderReportPdf(empty));
    expect(text).toContain("Total : 0 days");
  });

  test("fits a 31-day month plus a note on a single page", async () => {
    // The worst case for the layout. Two pages here means a wasted sheet on
    // every report a client receives.
    const full = context({
      report: {
        year: 2026,
        month: 1,
        days: fillWorkdays(2026, 1, "FR"),
        note: "Invoiced on the 1st of the following month. Payment terms 30 days net, per the framework agreement.",
      },
    });
    const text = extractPdfText(await renderReportPdf(full));
    expect(text).toContain("Page 1 of 1");
    expect(text).not.toContain("Page 2");
  });

  test("fits a 31-day month in French too, where labels are longer", async () => {
    const full = context({
      report: { year: 2026, month: 8, days: fillWorkdays(2026, 8, "FR"), note: "Facture envoyée le 1er septembre." },
    });
    expect(extractPdfText(await renderReportPdf(full, "fr"))).toContain("Page 1 sur 1");
  });
});

describe("pdfFilename", () => {
  test("is slugified and zero-padded", () => {
    expect(pdfFilename(august)).toBe("report-globex-2026-08.pdf");
  });

  test("strips accents and punctuation", () => {
    expect(pdfFilename(context({ client: { name: "Éditions Réunies, S.A." } }))).toBe(
      "report-editions-reunies-s-a-2026-08.pdf",
    );
  });

  test("falls back when the name has nothing usable", () => {
    expect(pdfFilename(context({ client: { name: "***" } }))).toBe("report-client-2026-08.pdf");
  });
});
