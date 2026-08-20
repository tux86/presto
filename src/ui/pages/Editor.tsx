import { ArrowLeft, Check, CopyPlus, Download, Eraser, Lock, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { monthName } from "../../core/dates.ts";
import { buildMonthGrid } from "../../core/grid.ts";
import { completionPercent, gridWorkdayCount, revenue, totalDays } from "../../core/totals.ts";
import { type DayValue, lookupFrom, type ReportContext } from "../../core/types.ts";
import { ApiError, api, download, type ReportDetail } from "../api.ts";
import { useConfirm } from "../components/Confirm.tsx";
import { Button, Card, ErrorText, Spinner } from "../components/ui.tsx";
import { cn, colorOf, days as fmtDays, hexOf, money, percent } from "../format.ts";
import { useT } from "../prefs.tsx";
import { Grid } from "../report/Grid.tsx";
import { ListView } from "../report/ListView.tsx";
import { Notes } from "../report/Notes.tsx";
import { useStore } from "../store.tsx";

type View = "calendar" | "list";

export function Editor() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useT();
  const { upsertReport, removeReport } = useStore();
  const { confirm, dialog } = useConfirm();

  const [ctx, setCtx] = useState<ReportDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [view, setView] = useState<View>("calendar");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Edits are buffered and sent as one PATCH. Days and notes used to travel on
  // separate requests, so a cell click landing inside the note debounce
  // replaced local state with a server copy that predated the note — and since
  // the note inputs are uncontrolled, the text stayed on screen while the save
  // was silently dropped.
  const pending = useRef<{ days?: Record<string, DayValue>; dayNotes?: Record<string, string> }>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refetched when the locale changes: holiday names arrive localized.
  useEffect(() => {
    let live = true;
    api
      .report(id, locale)
      .then((next) => live && setCtx(next))
      .catch(() => live && setMissing(true));
    return () => {
      live = false;
    };
  }, [id, locale]);

  /**
   * Apply the server's answer.
   * Content fields are kept local while edits are still buffered, so a reply
   * that predates them cannot roll the user's typing back.
   */
  const applyReport = useCallback(
    (report: ReportContext["report"]) => {
      setCtx((current) => {
        if (!current) return current;
        const buffered = pending.current;
        return {
          ...current,
          report: {
            ...report,
            days: buffered.days ?? report.days,
            dayNotes: buffered.dayNotes ?? report.dayNotes,
          },
        };
      });
      upsertReport(report);
    },
    [upsertReport],
  );

  /** Send whatever is buffered, if anything. */
  const commit = useCallback(
    async (reportId: string) => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const patch = pending.current;
      if (Object.keys(patch).length === 0) return;
      pending.current = {};
      setError(null);
      try {
        const saved = await api.updateReport(reportId, patch);
        applyReport(saved);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : String(e));
      }
    },
    [applyReport],
  );

  const schedule = useCallback(
    (reportId: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void commit(reportId), 400);
    },
    [commit],
  );

  // Flush on the way out rather than dropping the timer, which lost the last
  // edit whenever someone typed a note and immediately navigated away.
  const commitRef = useRef(commit);
  commitRef.current = commit;
  const reportId = ctx?.report.id;
  useEffect(
    () => () => {
      if (reportId) void commitRef.current(reportId);
    },
    [reportId],
  );

  /**
   * Run one of the whole-report actions.
   * Buffered edits are flushed first: fill, clear and copy replace the day map
   * wholesale, so a pending note left in the buffer would be written back on
   * top of the result.
   */
  const run = useCallback(
    async (key: string, action: () => Promise<ReportContext["report"]>) => {
      setBusy(key);
      setError(null);
      try {
        if (ctx) await commitRef.current(ctx.report.id);
        applyReport(await action());
      } catch (e) {
        setError(e instanceof ApiError ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [applyReport, ctx],
  );

  const grid = useMemo(
    () =>
      ctx
        ? buildMonthGrid(
            ctx.report.year,
            ctx.report.month,
            lookupFrom(ctx.holidays),
            ctx.report.days,
            ctx.report.dayNotes,
            locale,
          )
        : [],
    [ctx, locale],
  );

  const setValue = useCallback(
    async (day: number, value: DayValue) => {
      if (!ctx) return;
      const cell = grid.find((d) => d.day === day);
      if (cell?.holiday && cell.value === 0) {
        const ok = await confirm({
          title: t("editor.holidayTitle", { name: cell.holiday }),
          message: t("editor.holidayMessage"),
          confirmLabel: t("editor.holidayConfirm"),
        });
        if (!ok) return;
      }
      const days = { ...ctx.report.days };
      if (value === 0) delete days[String(day)];
      else days[String(day)] = value;

      // Paint immediately; the server is one hop away on localhost but the
      // grid should never feel like it is waiting.
      setCtx({ ...ctx, report: { ...ctx.report, days } });
      pending.current.days = days;
      schedule(ctx.report.id);
    },
    [ctx, grid, confirm, t, schedule],
  );

  const setNote = useCallback(
    (day: number, note: string) => {
      if (!ctx) return;
      const dayNotes = { ...ctx.report.dayNotes };
      if (note.trim()) dayNotes[String(day)] = note;
      else delete dayNotes[String(day)];

      setCtx({ ...ctx, report: { ...ctx.report, dayNotes } });
      pending.current.dayNotes = dayNotes;
      schedule(ctx.report.id);
    },
    [ctx, schedule],
  );

  const toggleStatus = useCallback(async () => {
    if (!ctx) return;
    if (ctx.report.status === "completed") {
      const ok = await confirm({
        title: t("editor.revertTitle"),
        message: t("editor.revertMessage"),
        confirmLabel: t("editor.backToDraft"),
        danger: true,
      });
      if (!ok) return;
    }
    const status = ctx.report.status === "completed" ? "draft" : "completed";
    void run("status", () => api.updateReport(ctx.report.id, { status }));
  }, [ctx, confirm, t, run]);

  const remove = useCallback(async () => {
    if (!ctx) return;
    const ok = await confirm({
      title: t("editor.deleteTitle"),
      message: t("editor.deleteMessage"),
      danger: true,
    });
    if (!ok) return;
    // Drop buffered edits so the unmount flush cannot PATCH a deleted report.
    pending.current = {};
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await api.deleteReport(ctx.report.id);
    removeReport(ctx.report.id);
    navigate("/");
  }, [ctx, confirm, t, removeReport, navigate]);

  if (missing) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted">{t("editor.notFound")}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }
  if (!ctx) return <Spinner label={t("common.loading")} />;

  const { report, mission, client } = ctx;
  const readOnly = report.status === "completed";
  const color = colorOf(client.name, client.color);
  const total = totalDays(report.days);
  const workdays = gridWorkdayCount(grid);
  const rate = report.dailyRate ?? mission.dailyRate;
  const earned = revenue(total, rate);
  const progress = completionPercent(total, workdays);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="size-4" />
          {t("common.back")}
        </Button>
        {!readOnly ? (
          <Button variant="ghost" size="sm" onClick={remove} className="text-danger hover:text-danger">
            <Trash2 className="size-3.5" />
            {t("common.delete")}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_18rem]">
        {/* Summary and actions */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5">
            <h1 className="text-lg font-semibold tracking-tight text-heading">
              {monthName(report.month, locale)} {report.year}
            </h1>
            <p className="mt-0.5 text-xs text-muted">
              {mission.name} · {client.name}
            </p>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular text-heading">{fmtDays(total)}</span>
              <span className="text-sm text-muted">/ {workdays}</span>
              <span className="ml-auto text-xs text-faint tabular">{percent(progress)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-inset">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, backgroundColor: hexOf(client.name, client.color) }}
              />
            </div>
            <p className="mt-1.5 text-xs text-faint">{t("editor.progress", { days: fmtDays(total), workdays })}</p>

            {earned !== null ? (
              <div className="mt-4 border-t border-edge pt-3">
                <div className="text-xs text-muted">{t("editor.revenue")}</div>
                <div className="text-lg font-semibold tabular text-accent-text">
                  {money(earned, client.currency, locale)}
                </div>
                {rate ? (
                  <div className="text-xs text-faint">
                    {money(rate, client.currency, locale)} · {t("editor.rate").toLowerCase()}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 space-y-2 border-t border-edge pt-4">
              {readOnly ? (
                <>
                  <Button
                    className="w-full"
                    busy={busy === "pdf"}
                    onClick={() => download(`/reports/${report.id}/pdf?locale=${locale}`)}
                  >
                    <Download className="size-3.5" />
                    {t("editor.exportPdf")}
                  </Button>
                  <Button variant="secondary" className="w-full" busy={busy === "status"} onClick={toggleStatus}>
                    <Undo2 className="size-3.5" />
                    {t("editor.backToDraft")}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    className="w-full"
                    busy={busy === "fill"}
                    onClick={() => run("fill", () => api.fillReport(report.id))}
                  >
                    <Check className="size-3.5" />
                    {t("editor.fill")}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    busy={busy === "copy"}
                    title={t("editor.copyPreviousHint")}
                    onClick={() => run("copy", () => api.copyPrevious(report.id))}
                  >
                    <CopyPlus className="size-3.5" />
                    {t("editor.copyPrevious")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    busy={busy === "clear"}
                    onClick={() => run("clear", () => api.clearReport(report.id))}
                  >
                    <Eraser className="size-3.5" />
                    {t("editor.clear")}
                  </Button>
                  <Button className="w-full" busy={busy === "status"} onClick={toggleStatus}>
                    <Lock className="size-3.5" />
                    {t("editor.markCompleted")}
                  </Button>
                </>
              )}
            </div>

            <ErrorText error={error} />
          </Card>
        </div>

        {/* The month */}
        <Card className="p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            {readOnly ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-elevated px-2 py-1 text-xs text-muted">
                <Lock className="size-3" />
                {t("editor.frozen")}
              </span>
            ) : (
              <span />
            )}
            <div className="flex gap-1 rounded-lg border border-edge bg-elevated p-1">
              {(["calendar", "list"] as View[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className={cn(
                    "cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    view === mode ? "bg-panel text-heading shadow-sm" : "text-muted hover:text-body",
                  )}
                >
                  {t(mode === "calendar" ? "editor.calendar" : "editor.list")}
                </button>
              ))}
            </div>
          </div>

          {view === "calendar" ? (
            <Grid
              key={report.id}
              grid={grid}
              color={color}
              readOnly={readOnly}
              onSetValue={setValue}
              onSetNote={setNote}
            />
          ) : (
            <ListView grid={grid} color={color} readOnly={readOnly} onSetValue={setValue} onSetNote={setNote} />
          )}
        </Card>

        {/* Notes */}
        <Notes
          className="xl:sticky xl:top-6 xl:self-start"
          note={report.note ?? ""}
          privateNote={report.privateNote ?? ""}
          readOnly={readOnly}
          onNote={(note) => run("note", () => api.updateReport(report.id, { note }))}
          onPrivateNote={(privateNote) => run("note", () => api.updateReport(report.id, { privateNote }))}
        />
      </div>

      {dialog}
    </div>
  );
}
