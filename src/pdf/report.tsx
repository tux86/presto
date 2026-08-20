import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { dayName, monthName } from "../core/dates.ts";
import { type Day, isWorkday, reportGrid } from "../core/grid.ts";
import { reportTotal } from "../core/totals.ts";
import type { Locale, ReportContext } from "../core/types.ts";
import { dayUnit, type Translate, translator } from "../i18n/index.ts";

const colors = {
  accent: "#4f46e5",
  text: "#1f2937",
  muted: "#6b7280",
  faint: "#9ca3af",
  panel: "#f9fafb",
  shade: "#f3f4f6",
  white: "#ffffff",
  border: "#e5e7eb",
};

const BOLD = "Helvetica-Bold";

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingHorizontal: 36,
    paddingBottom: 56,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: colors.text,
  },

  titleRow: { flexDirection: "row", alignItems: "flex-start" },
  titleBar: { width: 3, height: 22, backgroundColor: colors.accent, marginRight: 8, borderRadius: 1 },
  title: { fontSize: 18, fontFamily: BOLD },
  period: {
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: 11,
    marginTop: 2,
  },

  cards: { flexDirection: "row", gap: 8, marginTop: 10, marginBottom: 10 },
  card: { flex: 1, backgroundColor: colors.shade, borderRadius: 4, padding: 6 },
  cardLabel: {
    fontSize: 8,
    fontFamily: BOLD,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  cardValue: { fontSize: 11, fontFamily: BOLD },
  cardSub: { fontSize: 9, color: colors.muted, marginTop: 2 },

  head: { flexDirection: "row", backgroundColor: colors.accent, paddingVertical: 4, paddingHorizontal: 6 },
  th: { color: colors.white, fontFamily: BOLD, fontSize: 9 },
  row: {
    flexDirection: "row",
    paddingVertical: 2.2,
    paddingHorizontal: 6,
    borderBottom: `0.5px solid ${colors.border}`,
  },
  cell: { fontSize: 9 },
  dim: { color: colors.faint },

  colDate: { width: "15%" },
  colDay: { width: "12%" },
  colValue: { width: "10%", textAlign: "center" },
  colNote: { width: "63%" },

  note: {
    marginTop: 10,
    padding: 7,
    backgroundColor: colors.panel,
    borderRadius: 4,
    borderLeft: `2px solid ${colors.border}`,
  },
  noteLabel: {
    fontSize: 8,
    fontFamily: BOLD,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },

  footer: {
    position: "absolute",
    bottom: 36,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: `1px solid ${colors.border}`,
    paddingTop: 8,
  },
  total: { fontSize: 12, fontFamily: BOLD, color: colors.accent },
  pageNum: { fontSize: 8.5, color: colors.muted },
});

/** "—" for an untouched non-working day, "½" for a half day. */
function formatValue(day: Day): string {
  if (day.value === 0) return isWorkday(day) ? "0" : "—";
  if (day.value === 0.5) return "½";
  return "1";
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      {sub ? <Text style={styles.cardSub}>{sub}</Text> : null}
    </View>
  );
}

function DayRow({ day, index, locale, t }: { day: Day; index: number; locale: Locale; t: Translate }) {
  const offDay = !isWorkday(day);
  const dim = offDay ? styles.dim : undefined;
  const background = offDay ? colors.shade : index % 2 === 1 ? colors.panel : undefined;
  const description = [day.holiday ?? (offDay && !day.isWeekend ? t("pdf.holiday") : ""), day.note]
    .filter(Boolean)
    .join(" — ");

  return (
    <View style={background ? { ...styles.row, backgroundColor: background } : styles.row} wrap={false}>
      <Text style={[styles.cell, styles.colDate, dim]}>{day.iso.split("-").reverse().join("/")}</Text>
      <Text style={[styles.cell, styles.colDay, dim]}>{dayName(day.date, locale)}</Text>
      <Text style={[styles.cell, styles.colValue, dim]}>{formatValue(day)}</Text>
      <Text style={[styles.cell, styles.colNote, dim]}>{description}</Text>
    </View>
  );
}

function ReportDocument({ ctx, locale }: { ctx: ReportContext; locale: Locale }) {
  const t = translator(locale);
  const { report, mission, client, company } = ctx;
  const grid = reportGrid(report, locale);
  const total = reportTotal(report);

  return (
    <Document title={`${t("pdf.title")} — ${monthName(report.month, locale)} ${report.year}`} author={company.name}>
      <Page size="A4" style={styles.page}>
        <View>
          <View style={styles.titleRow}>
            <View style={styles.titleBar} />
            <Text style={styles.title}>{t("pdf.title")}</Text>
          </View>
          <Text style={styles.period}>
            {monthName(report.month, locale)} {report.year}
          </Text>
        </View>

        <View style={styles.cards}>
          <Card label={t("pdf.issuedBy")} value={company.name} sub={company.businessId} />
          <Card label={t("pdf.client")} value={client.name} sub={client.businessId} />
          <Card label={t("pdf.mission")} value={mission.name} />
        </View>

        <View>
          <View style={styles.head} fixed>
            <Text style={[styles.th, styles.colDate]}>{t("pdf.date")}</Text>
            <Text style={[styles.th, styles.colDay]}>{t("pdf.day")}</Text>
            <Text style={[styles.th, styles.colValue]}>{t("pdf.days")}</Text>
            <Text style={[styles.th, styles.colNote]}>{t("pdf.note")}</Text>
          </View>
          {grid.map((day, index) => (
            <DayRow key={day.iso} day={day} index={index} locale={locale} t={t} />
          ))}
        </View>

        {report.note ? (
          <View style={styles.note} wrap={false}>
            <Text style={styles.noteLabel}>{t("pdf.note")}</Text>
            <Text style={styles.cell}>{report.note}</Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={styles.total}>{`${t("pdf.total")} : ${total} ${dayUnit(t, total)}`}</Text>
          <Text
            style={styles.pageNum}
            render={({ pageNumber, totalPages }) => t("pdf.page", { page: pageNumber, pages: totalPages })}
          />
        </View>
      </Page>
    </Document>
  );
}

/**
 * Render one month as a PDF.
 * The private note is deliberately absent — it must never reach the client.
 */
export async function renderReportPdf(ctx: ReportContext, locale: Locale = "en"): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(<ReportDocument ctx={ctx} locale={locale} />));
}

/** report-globex-2026-08.pdf */
export function pdfFilename(ctx: ReportContext): string {
  const slug = ctx.client.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 60);
  return `report-${slug || "client"}-${ctx.report.year}-${String(ctx.report.month).padStart(2, "0")}.pdf`;
}
