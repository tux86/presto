// @ts-nocheck - React PDF uses JSX patterns that conflict with strict TS in Bun backend context

import { getDayName, getMonthName } from "@presto/shared";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import React from "react";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 20, borderBottom: "2px solid #1a1a2e", paddingBottom: 15 },
  title: { fontSize: 20, fontWeight: "bold", color: "#1a1a2e", marginBottom: 4 },
  subtitle: { fontSize: 12, color: "#555" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 15 },
  infoBlock: { flex: 1 },
  infoLabel: { fontSize: 8, color: "#888", textTransform: "uppercase", marginBottom: 2 },
  infoValue: { fontSize: 11, color: "#1a1a2e" },
  table: { marginTop: 20 },
  tableHeader: { flexDirection: "row", backgroundColor: "#1a1a2e", padding: 6 },
  tableHeaderText: { color: "#fff", fontWeight: "bold", fontSize: 9 },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #eee", padding: 5 },
  tableRowAlt: { flexDirection: "row", borderBottom: "1px solid #eee", padding: 5, backgroundColor: "#f8f9fa" },
  tableRowWeekend: { flexDirection: "row", borderBottom: "1px solid #eee", padding: 5, backgroundColor: "#e9ecef" },
  colDate: { width: "20%" },
  colDay: { width: "15%" },
  colValue: { width: "15%", textAlign: "center" },
  colTask: { width: "50%" },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1px solid #ddd",
    paddingTop: 10,
  },
  total: { fontSize: 14, fontWeight: "bold", color: "#1a1a2e" },
  note: { marginTop: 20, padding: 10, backgroundColor: "#f8f9fa", borderRadius: 4 },
  noteLabel: { fontSize: 8, color: "#888", marginBottom: 4 },
});

const labels = {
  fr: {
    title: "Relev\u00e9 d'Activit\u00e9",
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
    amount: "Montant",
    dayUnit: (n: number) => `jour${n > 1 ? "s" : ""}`,
  },
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
    amount: "Amount",
    dayUnit: (n: number) => `day${n > 1 ? "s" : ""}`,
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
    task: string | null;
    isWeekend: boolean;
    isHoliday: boolean;
    holidayName?: string | null;
  }[];
  mission: {
    name: string;
    dailyRate: number | null;
    client: { name: string };
  };
  user: {
    firstName: string;
    lastName: string;
    company: string | null;
  };
}

function ReportDocument({ report, locale = "fr" }: { report: PdfReport; locale?: "fr" | "en" }) {
  const l = labels[locale];
  const monthName = getMonthName(report.month);
  const currencyLocale = locale === "fr" ? "fr-FR" : "en-US";

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, l.title),
        React.createElement(Text, { style: styles.subtitle }, `${monthName} ${report.year}`),
        React.createElement(
          View,
          { style: styles.infoRow },
          React.createElement(
            View,
            { style: styles.infoBlock },
            React.createElement(Text, { style: styles.infoLabel }, l.consultant),
            React.createElement(Text, { style: styles.infoValue }, `${report.user.firstName} ${report.user.lastName}`),
            report.user.company &&
              React.createElement(Text, { style: { fontSize: 9, color: "#666" } }, report.user.company),
          ),
          React.createElement(
            View,
            { style: styles.infoBlock },
            React.createElement(Text, { style: styles.infoLabel }, l.client),
            React.createElement(Text, { style: styles.infoValue }, report.mission.client.name),
          ),
          React.createElement(
            View,
            { style: styles.infoBlock },
            React.createElement(Text, { style: styles.infoLabel }, l.mission),
            React.createElement(Text, { style: styles.infoValue }, report.mission.name),
          ),
        ),
      ),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: { ...styles.tableHeaderText, ...styles.colDate } }, l.date),
          React.createElement(Text, { style: { ...styles.tableHeaderText, ...styles.colDay } }, l.day),
          React.createElement(Text, { style: { ...styles.tableHeaderText, ...styles.colValue } }, l.days),
          React.createElement(Text, { style: { ...styles.tableHeaderText, ...styles.colTask } }, l.description),
        ),
        ...report.entries.map((entry, i) => {
          const date = new Date(entry.date);
          const dayStr = String(date.getDate()).padStart(2, "0");
          const monthStr = String(date.getMonth() + 1).padStart(2, "0");
          const dayName = getDayName(date);
          let rowStyle = i % 2 === 0 ? styles.tableRow : styles.tableRowAlt;
          if (entry.isWeekend || entry.isHoliday) rowStyle = styles.tableRowWeekend;
          const label = entry.isHoliday ? entry.holidayName || l.holiday : entry.task || "";

          return React.createElement(
            View,
            { style: rowStyle, key: i },
            React.createElement(Text, { style: styles.colDate }, `${dayStr}/${monthStr}/${report.year}`),
            React.createElement(Text, { style: styles.colDay }, dayName),
            React.createElement(
              Text,
              { style: styles.colValue },
              entry.isWeekend || entry.isHoliday ? "-" : String(entry.value),
            ),
            React.createElement(Text, { style: styles.colTask }, label),
          );
        }),
      ),
      report.note &&
        React.createElement(
          View,
          { style: styles.note },
          React.createElement(Text, { style: styles.noteLabel }, l.note),
          React.createElement(Text, null, report.note),
        ),
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          Text,
          { style: styles.total },
          `${l.total} : ${report.totalDays} ${l.dayUnit(report.totalDays)}`,
        ),
        report.mission.dailyRate &&
          React.createElement(
            Text,
            { style: styles.total },
            `${l.amount} : ${(report.totalDays * report.mission.dailyRate).toLocaleString(currencyLocale)} \u20ac`,
          ),
      ),
    ),
  );
}

export async function generateReportPdf(report: PdfReport, locale: "fr" | "en" = "fr"): Promise<Buffer> {
  const doc = React.createElement(ReportDocument, { report, locale });
  const buffer = await renderToBuffer(doc);
  return Buffer.from(buffer);
}
