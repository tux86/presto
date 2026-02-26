import type { Company } from "@presto/shared";
import { Building2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DeleteIconButton } from "@/components/ui/DeleteIconButton";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { useCompanies, useCreateCompany, useDeleteCompany, useUpdateCompany } from "@/hooks/use-companies";
import { useDeleteWithFkGuard } from "@/hooks/use-delete-with-fk-guard";
import { useT } from "@/i18n";

export function Companies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const { data: companies, isLoading } = useCompanies();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();
  const { t } = useT();

  const { handleDelete, dialog } = useDeleteWithFkGuard(deleteCompany, t, {
    confirmTitle: t("companies.deleteTitle"),
    confirmMessage: t("companies.deleteMessage"),
    fkErrorTitle: t("common.deleteErrorTitle"),
    fkErrorMessage: (count) => t("companies.deleteError", { count }),
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    setName("");
    setAddress("");
    setBusinessId("");
    setIsDefault(false);
    setShowModal(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      openCreate();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, openCreate]);

  const openEdit = (company: Company) => {
    setEditing(company);
    setName(company.name);
    setAddress(company.address || "");
    setBusinessId(company.businessId || "");
    setIsDefault(company.isDefault);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    if (editing) {
      await updateCompany.mutateAsync({
        id: editing.id,
        name,
        address: address || null,
        businessId: businessId || null,
        isDefault,
      });
    } else {
      await createCompany.mutateAsync({
        name,
        address: address || undefined,
        businessId: businessId || undefined,
        isDefault,
      });
    }
    setShowModal(false);
  };

  return (
    <div>
      <Header
        title={t("companies.title")}
        subtitle={t("companies.subtitle")}
        actions={<Button onClick={openCreate}>{t("companies.newCompany")}</Button>}
      />

      {isLoading ? (
        <Skeleton count={3} height="h-14" className="rounded-lg" />
      ) : (
        <Table
          data={companies ?? []}
          emptyMessage={t("companies.emptyMessage")}
          emptyIcon={<Building2 className="h-10 w-10 text-faint" strokeWidth={1.5} />}
          onRowClick={openEdit}
          mobileRender={(c) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="font-medium text-heading inline-flex items-center gap-2">
                  {c.name}
                  {c.isDefault && <Badge variant="info">{t("common.default")}</Badge>}
                </span>
                {c.address && <div className="text-xs text-muted mt-1 truncate">{c.address}</div>}
              </div>
              <DeleteIconButton onClick={() => handleDelete(c.id)} title={t("common.delete")} />
            </div>
          )}
          columns={[
            {
              key: "name",
              header: t("companies.name"),
              render: (c) => (
                <span className="font-medium text-heading inline-flex items-center gap-2">
                  {c.name}
                  {c.isDefault && <Badge variant="info">{t("common.default")}</Badge>}
                </span>
              ),
            },
            {
              key: "address",
              header: t("companies.address"),
              render: (c) => <span className="text-muted">{c.address || "-"}</span>,
            },
            {
              key: "businessId",
              header: t("companies.businessId"),
              render: (c) => <span className="text-muted">{c.businessId || "-"}</span>,
            },
            {
              key: "actions",
              header: "",
              className: "text-right",
              render: (c) => <DeleteIconButton onClick={() => handleDelete(c.id)} title={t("common.delete")} />,
            },
          ]}
        />
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? t("companies.editCompany") : t("companies.newCompany")}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t("companies.name")} value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label={t("companies.address")} value={address} onChange={(e) => setAddress(e.target.value)} optional />
          <Input
            label={t("companies.businessId")}
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            optional
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-edge text-accent focus:ring-accent"
            />
            <span className="text-sm text-heading">{t("companies.isDefault")}</span>
            <span className="text-xs text-muted">{t("companies.isDefaultHint")}</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={createCompany.isPending || updateCompany.isPending} disabled={!name}>
              {editing ? t("common.edit") : t("common.create")}
            </Button>
          </div>
        </form>
      </Modal>
      {dialog}
    </div>
  );
}
