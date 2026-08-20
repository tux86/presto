import { Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import type { Mission } from "../../core/types.ts";
import { ApiError, api } from "../api.ts";
import { useConfirm } from "../components/Confirm.tsx";
import { PageHeader } from "../components/Layout.tsx";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorText,
  Field,
  Input,
  Modal,
  ModalActions,
  Select,
} from "../components/ui.tsx";
import { COLORS, cn, colorOf, money } from "../format.ts";
import { useT } from "../prefs.tsx";
import { useStore } from "../store.tsx";

type Draft = Omit<Mission, "id">;

function MissionForm({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Mission | null;
  onClose: () => void;
  onSaved: (mission: Mission) => void;
}) {
  const { t } = useT();
  const { clients, companies } = useStore();

  const blank: Draft = {
    name: "",
    clientId: clients[0]?.id ?? "",
    companyId: companies.find((c) => c.isDefault)?.id ?? companies[0]?.id ?? "",
    dailyRate: null,
    startDate: null,
    endDate: null,
    isActive: true,
  };

  const [draft, setDraft] = useState<Draft>(initial ?? blank);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      onSaved(initial ? await api.updateMission(initial.id, draft) : await api.createMission(draft));
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? initial.name : t("missions.new")} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("common.name")} className="sm:col-span-2">
          <Input value={draft.name} autoFocus onChange={(e) => set("name", e.target.value)} />
        </Field>

        <Field label={t("missions.client")}>
          <Select value={draft.clientId} onChange={(e) => set("clientId", e.target.value)}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("missions.company")}>
          <Select value={draft.companyId} onChange={(e) => set("companyId", e.target.value)}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("missions.rate")} className="sm:col-span-2">
          <Input
            type="number"
            min={0}
            step="any"
            value={draft.dailyRate ?? ""}
            onChange={(e) => set("dailyRate", e.target.value === "" ? null : Number(e.target.value))}
          />
        </Field>

        <Field label={t("missions.startDate")} hint={t("common.optional")}>
          <Input type="date" value={draft.startDate ?? ""} onChange={(e) => set("startDate", e.target.value || null)} />
        </Field>
        <Field label={t("missions.endDate")} hint={t("common.optional")}>
          <Input type="date" value={draft.endDate ?? ""} onChange={(e) => set("endDate", e.target.value || null)} />
        </Field>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-body sm:col-span-2">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="size-4 cursor-pointer accent-[var(--th-accent)]"
          />
          {t("missions.active")}
        </label>
      </div>

      <ErrorText error={error} />
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button busy={busy} disabled={!draft.name.trim() || !draft.clientId || !draft.companyId} onClick={submit}>
          {t("common.save")}
        </Button>
      </ModalActions>
    </Modal>
  );
}

export function Missions() {
  const { t, locale } = useT();
  const { missions, clients, companies, client, company, upsertMission, removeMission } = useStore();
  const { confirm, dialog } = useConfirm();
  const [editing, setEditing] = useState<Mission | null>(null);
  const [open, setOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => missions.filter((m) => showInactive || m.isActive), [missions, showInactive]);
  const hasInactive = missions.some((m) => !m.isActive);
  const canCreate = clients.length > 0 && companies.length > 0;

  async function remove(mission: Mission) {
    const ok = await confirm({
      title: t("missions.deleteTitle", { name: mission.name }),
      message: t("delete.confirm"),
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteMission(mission.id);
      removeMission(mission.id);
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "IN_USE"
          ? t("delete.inUseMessage", { count: e.count ?? 0, entity: t("nav.reports").toLowerCase() })
          : String(e),
      );
    }
  }

  return (
    <div>
      <PageHeader
        title={t("missions.title")}
        actions={
          <>
            {hasInactive ? (
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="size-3.5 cursor-pointer accent-[var(--th-accent)]"
                />
                {t("missions.showInactive")}
              </label>
            ) : null}
            <Button
              disabled={!canCreate}
              title={canCreate ? undefined : t("missions.needsClient")}
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="size-4" />
              {t("missions.new")}
            </Button>
          </>
        }
      />

      <ErrorText error={error} />

      {visible.length === 0 ? (
        <EmptyState
          icon={<Wrench className="size-9" strokeWidth={1.5} />}
          title={t("missions.empty")}
          hint={canCreate ? undefined : t("missions.needsClient")}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((mission) => {
            const c = client(mission.clientId);
            const co = company(mission.companyId);
            return (
              <Card key={mission.id} className={cn("p-4", !mission.isActive && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-heading">{mission.name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <span
                        className={cn("size-2 rounded-full", COLORS[colorOf(c?.name ?? "", c?.color ?? null)].dot)}
                      />
                      <span className="truncate">{c?.name}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      aria-label={t("common.edit")}
                      onClick={() => {
                        setEditing(mission);
                        setOpen(true);
                      }}
                      className="cursor-pointer rounded p-1.5 text-faint hover:bg-elevated hover:text-heading"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("common.delete")}
                      onClick={() => remove(mission)}
                      className="cursor-pointer rounded p-1.5 text-faint hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {mission.dailyRate != null && c ? (
                    <span className="font-semibold tabular text-accent-text">
                      {money(mission.dailyRate, c.currency, locale)}
                    </span>
                  ) : null}
                  <span className="text-faint">{co?.name}</span>
                  {!mission.isActive ? <Badge>{t("missions.inactive")}</Badge> : null}
                </div>

                {mission.startDate || mission.endDate ? (
                  <p className="mt-2 text-xs tabular text-faint">
                    {mission.startDate ?? "…"} → {mission.endDate ?? "…"}
                  </p>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {open ? (
        <MissionForm
          key={editing?.id ?? "new"}
          open={open}
          initial={editing}
          onClose={() => setOpen(false)}
          onSaved={upsertMission}
        />
      ) : null}
      {dialog}
    </div>
  );
}
