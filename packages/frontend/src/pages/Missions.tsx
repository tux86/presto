import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { useMissions, useCreateMission, useUpdateMission, useDeleteMission } from "@/hooks/use-missions";
import { useClients } from "@/hooks/use-clients";
import { useConfirm } from "@/hooks/use-confirm";
import { useT } from "@/i18n";
import { formatCurrency } from "@/lib/utils";
import type { Mission } from "@presto/shared";

export function Missions() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Mission | null>(null);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [dailyRate, setDailyRate] = useState("");

  const { data: missions, isLoading } = useMissions();
  const { data: clients } = useClients();
  const createMission = useCreateMission();
  const updateMission = useUpdateMission();
  const deleteMission = useDeleteMission();
  const { confirm, dialog } = useConfirm();
  const { t } = useT();

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
    await deleteMission.mutateAsync(id);
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

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-panel rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <Table
          data={missions ?? []}
          emptyMessage={t("missions.emptyMessage")}
          onRowClick={openEdit}
          columns={[
            { key: "name", header: t("missions.title"), render: (m) => <span className="font-medium text-heading">{m.name}</span> },
            { key: "client", header: t("missions.client"), render: (m) => <span className="text-muted">{m.client?.name ?? "-"}</span> },
            { key: "tjm", header: t("missions.dailyRate"), render: (m) => <span className="text-muted font-mono">{m.dailyRate ? formatCurrency(m.dailyRate) : "-"}</span> },
            {
              key: "status",
              header: t("missions.status"),
              render: (m) => (
                <button onClick={(e) => { e.stopPropagation(); handleToggleActive(m); }} className="cursor-pointer">
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
                  onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                  className="text-xs text-faint hover:text-red-500 transition-colors cursor-pointer"
                >
                  {t("common.delete")}
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
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-muted">{t("missions.client")}</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-lg border border-edge bg-panel px-3.5 py-2 text-sm text-heading outline-none"
              required
            >
              <option value="">{t("missions.selectClient")}</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Input label={t("missions.dailyRateOptional")} type="number" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} placeholder="550" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>{t("common.cancel")}</Button>
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
