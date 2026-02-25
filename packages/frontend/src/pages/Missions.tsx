import type { Mission } from "@presto/shared";
import { Briefcase, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ApiError } from "@/api/client";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ClientFilterChips } from "@/components/ui/ClientFilterChips";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { useClients } from "@/hooks/use-clients";
import { useConfirm } from "@/hooks/use-confirm";
import { useCreateMission, useDeleteMission, useMissions, useUpdateMission } from "@/hooks/use-missions";
import { useT } from "@/i18n";
import { formatCurrency } from "@/lib/utils";

export function Missions() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Mission | null>(null);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [filterClientId, setFilterClientId] = useState("");

  const { data: missions, isLoading } = useMissions();
  const { data: clients } = useClients();
  const createMission = useCreateMission();
  const updateMission = useUpdateMission();
  const deleteMission = useDeleteMission();
  const { confirm, dialog } = useConfirm();
  const { t } = useT();

  const clientList = useMemo(() => {
    if (!missions) return [];
    const map = new Map<string, { id: string; name: string; color: string | null }>();
    for (const m of missions) {
      if (m.client?.id && !map.has(m.client.id)) {
        map.set(m.client.id, { id: m.client.id, name: m.client.name, color: m.client.color ?? null });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [missions]);

  const filteredMissions = filterClientId
    ? (missions ?? []).filter((m) => m.client?.id === filterClientId)
    : (missions ?? []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setClientId("");
    setDailyRate("");
    setShowModal(true);
  };

  const openEdit = (mission: Mission) => {
    setEditing(mission);
    setName(mission.name);
    setClientId(mission.clientId);
    setDailyRate(mission.dailyRate?.toString() || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !clientId) return;

    const data = {
      name,
      clientId,
      dailyRate: dailyRate ? parseFloat(dailyRate) : undefined,
    };

    if (editing) {
      await updateMission.mutateAsync({ id: editing.id, ...data });
    } else {
      await createMission.mutateAsync(data);
    }
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: t("missions.deleteTitle"),
      message: t("missions.deleteMessage"),
      confirmLabel: t("common.delete"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteMission.mutateAsync(id);
    } catch (err) {
      if (err instanceof ApiError && err.code === "FK_CONSTRAINT") {
        await confirm({
          title: t("common.deleteErrorTitle"),
          message: t("missions.deleteError", { count: err.dependentCount ?? 0 }),
          confirmLabel: t("common.ok"),
        });
      } else {
        throw err;
      }
    }
  };

  const handleToggleActive = async (mission: Mission) => {
    await updateMission.mutateAsync({
      id: mission.id,
      isActive: !mission.isActive,
    });
  };

  return (
    <div>
      <Header
        title={t("missions.title")}
        subtitle={t("missions.subtitle")}
        actions={<Button onClick={openCreate}>{t("missions.newMission")}</Button>}
      />

      {!isLoading && (
        <ClientFilterChips
          clients={clientList.map((c) => ({
            ...c,
            count: (missions ?? []).filter((m) => m.client?.id === c.id).length,
          }))}
          value={filterClientId}
          onChange={setFilterClientId}
        />
      )}

      {isLoading ? (
        <Skeleton count={3} height="h-14" className="rounded-lg" />
      ) : (
        <Table
          data={filteredMissions}
          emptyMessage={t("missions.emptyMessage")}
          emptyIcon={<Briefcase className="h-10 w-10 text-faint" strokeWidth={1.5} />}
          onRowClick={openEdit}
          mobileRender={(m) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="font-medium text-heading">{m.name}</span>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                  <span>{m.client?.name ?? "-"}</span>
                  {m.dailyRate && (
                    <>
                      <span>&middot;</span>
                      <span className="font-mono">{formatCurrency(m.dailyRate, m.client?.currency)}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(m);
                  }}
                  className="cursor-pointer"
                >
                  <Badge variant={m.isActive ? "success" : "default"}>
                    {m.isActive ? t("missions.active") : t("missions.inactive")}
                  </Badge>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(m.id);
                  }}
                  className="p-1.5 rounded-md text-faint hover:text-error hover:bg-error-subtle transition-colors cursor-pointer"
                  title={t("common.delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          columns={[
            {
              key: "name",
              header: t("missions.title"),
              render: (m) => <span className="font-medium text-heading">{m.name}</span>,
            },
            {
              key: "client",
              header: t("missions.client"),
              render: (m) => <span className="text-muted">{m.client?.name ?? "-"}</span>,
            },
            {
              key: "dailyRate",
              header: t("missions.dailyRate"),
              render: (m) => (
                <span className="text-muted font-mono">
                  {m.dailyRate ? formatCurrency(m.dailyRate, m.client?.currency) : "-"}
                </span>
              ),
            },
            {
              key: "status",
              header: t("missions.status"),
              render: (m) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(m);
                  }}
                  className="cursor-pointer"
                >
                  <Badge variant={m.isActive ? "success" : "default"}>
                    {m.isActive ? t("missions.active") : t("missions.inactive")}
                  </Badge>
                </button>
              ),
            },
            {
              key: "actions",
              header: "",
              className: "text-right",
              render: (m) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(m.id);
                  }}
                  className="p-1.5 rounded-md text-faint hover:text-error hover:bg-error-subtle transition-colors cursor-pointer"
                  title={t("common.delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? t("missions.editMission") : t("missions.newMission")}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t("missions.missionName")} value={name} onChange={(e) => setName(e.target.value)} required />
          <Select label={t("missions.client")} value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            <option value="">{t("missions.selectClient")}</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            label={t("missions.dailyRate")}
            hint={t("missions.dailyRateHint")}
            type="number"
            value={dailyRate}
            onChange={(e) => setDailyRate(e.target.value)}
            placeholder="550"
            optional
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={createMission.isPending || updateMission.isPending}>
              {editing ? t("common.edit") : t("common.create")}
            </Button>
          </div>
        </form>
      </Modal>
      {dialog}
    </div>
  );
}
