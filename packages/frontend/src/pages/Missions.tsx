import type { Mission } from "@presto/shared";
import { Briefcase, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ApiError } from "@/api/client";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FilterChips } from "@/components/ui/FilterChips";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { useClients } from "@/hooks/use-clients";
import { useCompanies } from "@/hooks/use-companies";
import { useConfirm } from "@/hooks/use-confirm";
import { useCreateMission, useDeleteMission, useMissions, useUpdateMission } from "@/hooks/use-missions";
import { useT } from "@/i18n";
import { formatCurrency } from "@/lib/utils";

export function Missions() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Mission | null>(null);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [filterClientId, setFilterClientId] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState("");

  const { data: missions, isLoading } = useMissions();
  const { data: clients } = useClients();
  const { data: companiesList } = useCompanies();
  const createMission = useCreateMission();
  const updateMission = useUpdateMission();
  const deleteMission = useDeleteMission();
  const { confirm, dialog } = useConfirm();
  const { t } = useT();

  const companyList = useMemo(() => {
    if (!missions) return [];
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const m of missions) {
      if (!m.company?.id) continue;
      const existing = map.get(m.company.id);
      if (existing) {
        existing.count++;
      } else {
        map.set(m.company.id, { id: m.company.id, name: m.company.name, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [missions]);

  const clientList = useMemo(() => {
    if (!missions) return [];
    const map = new Map<string, { id: string; name: string; color: string | null; count: number }>();
    for (const m of missions) {
      if (!m.client?.id) continue;
      const existing = map.get(m.client.id);
      if (existing) {
        existing.count++;
      } else {
        map.set(m.client.id, { id: m.client.id, name: m.client.name, color: m.client.color ?? null, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [missions]);

  const filteredMissions = (missions ?? []).filter(
    (m) =>
      (!filterClientId || m.client?.id === filterClientId) && (!filterCompanyId || m.companyId === filterCompanyId),
  );

  const defaultCompanyId = companiesList?.find((c) => c.isDefault)?.id ?? companiesList?.[0]?.id ?? "";

  const openCreate = () => {
    setEditing(null);
    setName("");
    setClientId("");
    setCompanyId(defaultCompanyId);
    setDailyRate("");
    setShowModal(true);
  };

  const openEdit = (mission: Mission) => {
    setEditing(mission);
    setName(mission.name);
    setClientId(mission.clientId);
    setCompanyId(mission.companyId);
    setDailyRate(mission.dailyRate?.toString() || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !clientId || !companyId) return;

    const data = {
      name,
      clientId,
      companyId,
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
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-5">
          <FilterChips
            items={companyList}
            value={filterCompanyId}
            onChange={setFilterCompanyId}
            allLabel={t("reporting.allCompanies")}
            label={t("reporting.filterCompany")}
          />
          {companyList.length >= 2 && clientList.length >= 2 && (
            <div className="hidden md:block h-5 w-px bg-edge shrink-0" />
          )}
          <FilterChips
            items={clientList}
            value={filterClientId}
            onChange={setFilterClientId}
            label={t("reporting.filterClient")}
          />
        </div>
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
          <Select
            label={t("missions.company")}
            hint={t("missions.companyHint")}
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            required
          >
            <option value="">{t("missions.selectCompany")}</option>
            {companiesList?.map((co) => (
              <option key={co.id} value={co.id}>
                {co.name}
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
            suffix={clients?.find((c) => c.id === clientId)?.currency}
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
