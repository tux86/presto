import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table } from "@/components/ui/Table";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/use-clients";
import { useConfirm } from "@/hooks/use-confirm";
import { useT } from "@/i18n";
import type { Client } from "@presto/shared";

export function Clients() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const { confirm, dialog } = useConfirm();
  const { t } = useT();

  const openCreate = () => { setEditing(null); setName(""); setBusinessId(""); setEmail(""); setAddress(""); setShowModal(true); };
  const openEdit = (client: Client) => { setEditing(client); setName(client.name); setBusinessId(client.businessId || ""); setEmail(client.email || ""); setAddress(client.address || ""); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const data = { name, businessId: businessId || undefined, email: email || undefined, address: address || undefined };
    if (editing) { await updateClient.mutateAsync({ id: editing.id, ...data }); }
    else { await createClient.mutateAsync(data); }
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: t("clients.deleteTitle"),
      message: t("clients.deleteMessage"),
      confirmLabel: t("common.delete"),
      variant: "danger",
    });
    if (!ok) return;
    await deleteClient.mutateAsync(id);
  };

  return (
    <div>
      <Header title={t("clients.title")} subtitle={t("clients.subtitle")} actions={<Button onClick={openCreate}>{t("clients.newClient")}</Button>} />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-panel rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <Table
          data={clients ?? []}
          emptyMessage={t("clients.emptyMessage")}
          onRowClick={openEdit}
          columns={[
            { key: "name", header: t("clients.name"), render: (c) => <span className="font-medium text-heading">{c.name}</span> },
            { key: "businessId", header: t("clients.businessId"), render: (c) => <span className="text-muted font-mono text-xs">{c.businessId || "-"}</span> },
            { key: "email", header: t("clients.email"), render: (c) => <span className="text-muted">{c.email || "-"}</span> },
            {
              key: "actions", header: "", className: "text-right",
              render: (c) => (
                <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="text-xs text-faint hover:text-red-500 transition-colors cursor-pointer">
                  {t("common.delete")}
                </button>
              ),
            },
          ]}
        />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? t("clients.editClient") : t("clients.newClient")}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t("clients.name")} value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label={t("clients.businessId")} value={businessId} onChange={(e) => setBusinessId(e.target.value)} placeholder="123 456 789 01234" />
          <Input label={t("clients.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label={t("clients.address")} value={address} onChange={(e) => setAddress(e.target.value)} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>{t("common.cancel")}</Button>
            <Button type="submit" loading={createClient.isPending || updateClient.isPending}>{editing ? t("common.edit") : t("common.create")}</Button>
          </div>
        </form>
      </Modal>
      {dialog}
    </div>
  );
}
