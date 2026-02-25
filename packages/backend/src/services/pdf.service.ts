// @ts-nocheck - React PDF uses JSX patterns that conflict with strict TS in Bun backend context

import { join } from "node:path";
import { getDayName, getMonthName, type Locale } from "@presto/shared";
import { Document, Font, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import React from "react";

const fontsDir = join(import.meta.dir, "../assets/fonts");

Font.register({
  family: "Inter",
  fonts: [
    { src: join(fontsDir, "Inter-Regular.ttf"), fontWeight: 400 },
    { src: join(fontsDir, "Inter-Bold.ttf"), fontWeight: 700 },
  ],
});

const h = React.createElement;

const colors = {
  accent: "#4f46e5",
  text: "#1f2937",
  muted: "#6b7280",
  lightBg: "#f9fafb",
  lighterBg: "#f3f4f6",
  white: "#ffffff",
  border: "#e5e7eb",
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Inter", color: colors.text },

  // Header
  header: { marginBottom: 14 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 2 },
  titleBar: { width: 3, height: 22, backgroundColor: colors.accent, marginRight: 8, borderRadius: 1 },
  titleText: { fontSize: 18, fontFamily: "Inter", fontWeight: 700, color: colors.text },
  subtitle: { fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 1, marginLeft: 11 },

  // Info cards
  infoRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  infoCard: { flex: 1, backgroundColor: colors.lighterBg, borderRadius: 4, padding: 8 },
  infoLabel: {
    fontSize: 9,
    fontFamily: "Inter",
    fontWeight: 700,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: { fontSize: 11, fontFamily: "Inter", fontWeight: 700, color: colors.text },
  infoSub: { fontSize: 10, color: colors.muted, marginTop: 1 },

  // Table
  table: { marginTop: 12 },
  tableHeader: { flexDirection: "row", backgroundColor: colors.accent, paddingVertical: 5, paddingHorizontal: 6 },
  thText: { color: colors.white, fontFamily: "Inter", fontWeight: 700, fontSize: 10 },
  row: {
    flexDirection: "row",
    paddingVertical: 3.5,
    paddingHorizontal: 6,
    borderBottom: `0.5px solid ${colors.border}`,
  },
  cell: { fontSize: 10 },
  cellMuted: { fontSize: 10, color: colors.muted },
  colDate: { width: "14%" },
  colDay: { width: "10%" },
  colValue: { width: "10%", textAlign: "center" },
  colDesc: { width: "66%" },

  // Note
  note: { marginTop: 12, padding: 8, backgroundColor: colors.lightBg, borderRadius: 4 },
  noteLabel: { fontSize: 9, fontFamily: "Inter", fontWeight: 700, color: colors.muted, marginBottom: 3 },

  // Footer
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
  total: { fontSize: 12, fontFamily: "Inter", fontWeight: 700, color: colors.accent },
  pageNum: { fontSize: 9, color: colors.muted },
});

// Pre-computed merged column styles to avoid repeated spreads
const thDate = { ...styles.thText, ...styles.colDate };
const thDay = { ...styles.thText, ...styles.colDay };
const thValue = { ...styles.thText, ...styles.colValue };
const thDesc = { ...styles.thText, ...styles.colDesc };
const colStyles = {
  date: [
    { ...styles.cell, ...styles.colDate },
    { ...styles.cellMuted, ...styles.colDate },
  ],
  day: [
    { ...styles.cell, ...styles.colDay },
    { ...styles.cellMuted, ...styles.colDay },
  ],
  value: [
    { ...styles.cell, ...styles.colValue },
    { ...styles.cellMuted, ...styles.colValue },
  ],
  desc: [
    { ...styles.cell, ...styles.colDesc },
    { ...styles.cellMuted, ...styles.colDesc },
  ],
} as const;

const labels: Record<
  Locale,
  {
    title: string;
    consultant: string;
    client: string;
    mission: string;
    date: string;
    day: string;
    days: string;
    description: string;
    holiday: string;
    note: string;
    total: string;
    dayUnit: (n: number) => string;
    page: string;
  }
> = {
  en: {
    title: "Activity Report",
    consultant: "Consultant",
    client: "Client",
    mission: "Mission",
    date: "Date",
    day: "Day",
    days: "Days",
    description: "Description",
    holiday: "Holiday",
    note: "Note",
    total: "Total",
    dayUnit: (n: number) => `day${n > 1 ? "s" : ""}`,
    page: "Page",
  },
  fr: {
    title: "Compte-Rendu d'Activit\u00e9",
    consultant: "Consultant",
    client: "Client",
    mission: "Mission",
    date: "Date",
    day: "Jour",
    days: "Jours",
    description: "Description",
    holiday: "F\u00e9ri\u00e9",
    note: "Note",
    total: "Total",
    dayUnit: (n: number) => `jour${n > 1 ? "s" : ""}`,
    page: "Page",
  },
  de: {
    title: "T\u00e4tigkeitsbericht",
    consultant: "Berater",
    client: "Kunde",
    mission: "Auftrag",
    date: "Datum",
    day: "Tag",
    days: "Tage",
    description: "Beschreibung",
    holiday: "Feiertag",
    note: "Anmerkung",
    total: "Gesamt",
    dayUnit: (n: number) => `Tag${n > 1 ? "e" : ""}`,
    page: "Seite",
  },
  es: {
    title: "Informe de Actividad",
    consultant: "Consultor",
    client: "Cliente",
    mission: "Misi\u00f3n",
    date: "Fecha",
    day: "D\u00eda",
    days: "D\u00edas",
    description: "Descripci\u00f3n",
    holiday: "Festivo",
    note: "Nota",
    total: "Total",
    dayUnit: (n: number) => `d\u00eda${n > 1 ? "s" : ""}`,
    page: "P\u00e1gina",
  },
  pt: {
    title: "Relat\u00f3rio de Atividade",
    consultant: "Consultor",
    client: "Cliente",
    mission: "Miss\u00e3o",
    date: "Data",
    day: "Dia",
    days: "Dias",
    description: "Descri\u00e7\u00e3o",
    holiday: "Feriado",
    note: "Nota",
    total: "Total",
    dayUnit: (n: number) => `dia${n > 1 ? "s" : ""}`,
    page: "P\u00e1gina",
  },
};

interface PdfReport {
  month: number;
  year: number;
  totalDays: number;
  note: string | null;
  entries: {
    date: Date | string;
    value: number;
    note: string | null;
    isWeekend: boolean;
    isHoliday: boolean;
    holidayName?: string | null;
  }[];
  mission: {
    name: string;
    dailyRate: number | null;
    client: { name: string; currency: string };
    company?: { name: string } | null;
  };
  user: {
    firstName: string;
    lastName: string;
  };
}

function formatDayValue(value: number, isNonWorked: boolean): string {
  if (isNonWorked && value === 0) return "\u2014";
  if (value === 0.5) return "\u00bd";
  return String(value);
}

function rowBg(i: number, isNonWorked: boolean): string | undefined {
  if (isNonWorked) return colors.lighterBg;
  return i % 2 !== 0 ? colors.lightBg : undefined;
}

function ReportDocument({ report, locale = "en" }: { report: PdfReport; locale?: Locale }) {
  const l = labels[locale];
  const monthName = getMonthName(report.month, locale);

  return h(
    Document,
    null,
    h(
      Page,
      { size: "A4", style: styles.page },

      // Header
      h(
        View,
        { style: styles.header },
        h(
          View,
          { style: styles.titleRow },
          h(View, { style: styles.titleBar }),
          h(Text, { style: styles.titleText }, l.title),
        ),
        h(Text, { style: styles.subtitle }, `${monthName} ${report.year}`),
        h(
          View,
          { style: styles.infoRow },
          h(
            View,
            { style: styles.infoCard },
            h(Text, { style: styles.infoLabel }, l.consultant),
            h(Text, { style: styles.infoValue }, `${report.user.firstName} ${report.user.lastName}`),
            report.mission.company?.name && h(Text, { style: styles.infoSub }, report.mission.company.name),
          ),
          h(
            View,
            { style: styles.infoCard },
            h(Text, { style: styles.infoLabel }, l.client),
            h(Text, { style: styles.infoValue }, report.mission.client.name),
          ),
          h(
            View,
            { style: styles.infoCard },
            h(Text, { style: styles.infoLabel }, l.mission),
            h(Text, { style: styles.infoValue }, report.mission.name),
          ),
        ),
      ),

      // Table
      h(
        View,
        { style: styles.table },
        h(
          View,
          { style: styles.tableHeader },
          h(Text, { style: thDate }, l.date),
          h(Text, { style: thDay }, l.day),
          h(Text, { style: thValue }, l.days),
          h(Text, { style: thDesc }, l.description),
        ),
        ...report.entries.map((entry, i) => {
          const date = new Date(entry.date);
          const dayStr = String(date.getDate()).padStart(2, "0");
          const monthStr = String(date.getMonth() + 1).padStart(2, "0");
          const isNonWorked = entry.isWeekend || entry.isHoliday;
          const m = isNonWorked ? 1 : 0; // muted index
          const bg = rowBg(i, isNonWorked);
          const rowStyle = bg ? { ...styles.row, backgroundColor: bg } : styles.row;

          const holidayLabel = entry.isHoliday ? entry.holidayName || l.holiday : "";
          const noteLabel = entry.note || "";
          const desc = [holidayLabel, noteLabel].filter(Boolean).join(" \u2014 ");

          return h(
            View,
            { style: rowStyle, key: i },
            h(Text, { style: colStyles.date[m] }, `${dayStr}/${monthStr}/${report.year}`),
            h(Text, { style: colStyles.day[m] }, getDayName(date, locale)),
            h(Text, { style: colStyles.value[m] }, formatDayValue(entry.value, isNonWorked)),
            h(Text, { style: colStyles.desc[m] }, desc),
          );
        }),
      ),

      // Note
      report.note &&
        h(
          View,
          { style: styles.note },
          h(Text, { style: styles.noteLabel }, l.note),
          h(Text, { style: styles.cell }, report.note),
        ),

      // Footer
      h(
        View,
        { style: styles.footer, fixed: true },
        h(Text, { style: styles.total }, `${l.total} : ${report.totalDays} ${l.dayUnit(report.totalDays)}`),
        h(Text, {
          style: styles.pageNum,
          render: ({ pageNumber, totalPages }) => `${l.page} ${pageNumber} / ${totalPages}`,
        }),
      ),
    ),
  );
}

export async function generateReportPdf(report: PdfReport, locale: Locale = "en"): Promise<Buffer> {
  const doc = h(ReportDocument, { report, locale });
  const buffer = await renderToBuffer(doc);
  return Buffer.from(buffer);
}
