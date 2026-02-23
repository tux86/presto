import type { Client, CurrencyCode, HolidayCountryCode } from "@presto/shared";
import { CURRENCIES, getCountryName, getCurrencyName, getCurrencySymbol, HOLIDAY_COUNTRIES } from "@presto/shared";
import "flag-icons/css/flag-icons.min.css";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { useClients, useCreateClient, useDeleteClient, useUpdateClient } from "@/hooks/use-clients";
import { useConfirm } from "@/hooks/use-confirm";
import { useT } from "@/i18n";

function CountryFlag({ code }: { code: string }) {
  return <span className={`fi fi-${code.toLowerCase()} fis`} />;
}

export function Clients() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");
  const [holidayCountry, setHolidayCountry] = useState<HolidayCountryCode>("");

  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const { confirm, dialog } = useConfirm();
  const { t, locale } = useT();

  const openCreate = () => {
    setEditing(null);
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setBusinessId("");
    setCurrency("");
    setHolidayCountry("");
    setShowModal(true);
  };
  const openEdit = (client: Client) => {
    setEditing(client);
    setName(client.name);
    setEmail(client.email || "");
    setPhone(client.phone || "");
    setAddress(client.address || "");
    setBusinessId(client.businessId || "");
    setCurrency(client.currency);
    setHolidayCountry(client.holidayCountry);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !currency || !holidayCountry) return;
    const data = {
      name,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
      businessId: businessId || undefined,
      currency,
      holidayCountry,
    };
    if (editing) {
      await updateClient.mutateAsync({ id: editing.id, ...data });
    } else {
      await createClient.mutateAsync(data);
    }
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
      <Header
        title={t("clients.title")}
        subtitle={t("clients.subtitle")}
        actions={<Button onClick={openCreate}>{t("clients.newClient")}</Button>}
      />

      {isLoading ? (
        <Skeleton count={3} height="h-14" className="rounded-lg" />
      ) : (
        <Table
          data={clients ?? []}
          emptyMessage={t("clients.emptyMessage")}
          onRowClick={openEdit}
          columns={[
            {
              key: "name",
              header: t("clients.name"),
              render: (c) => <span className="font-medium text-heading">{c.name}</span>,
            },
            {
              key: "email",
              header: t("clients.email"),
              render: (c) => <span className="text-muted">{c.email || "-"}</span>,
            },
            {
              key: "phone",
              header: t("clients.phone"),
              render: (c) => <span className="text-muted">{c.phone || "-"}</span>,
            },
            {
              key: "currency",
              header: t("clients.currency"),
              render: (c) => (
                <span className="text-muted text-xs">
                  {getCurrencySymbol(c.currency, locale)} {c.currency}
                </span>
              ),
            },
            {
              key: "holidayCountry",
              header: t("clients.holidayCountry"),
              render: (c) => (
                <span className="text-muted text-xs">
                  <CountryFlag code={c.holidayCountry} /> {c.holidayCountry}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              className: "text-right",
              render: (c) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(c.id);
                  }}
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
        title={editing ? t("clients.editClient") : t("clients.newClient")}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Identity */}
          <Input label={t("clients.name")} value={name} onChange={(e) => setName(e.target.value)} required />

          {/* Contact */}
          <Input
            label={t("clients.email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            optional
          />
          <Input
            label={t("clients.phone")}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            optional
          />
          <Input label={t("clients.address")} value={address} onChange={(e) => setAddress(e.target.value)} optional />

          {/* Billing */}
          <Input
            label={t("clients.businessId")}
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            placeholder="123 456 789 01234"
            optional
          />
          <SearchableSelect
            label={t("clients.currency")}
            hint={t("clients.currencyHint")}
            placeholder={t("clients.selectCurrency")}
            value={currency}
            onChange={(val) => setCurrency(val as CurrencyCode)}
            options={CURRENCIES.map((c) => {
              const symbol = getCurrencySymbol(c, locale);
              const name = getCurrencyName(c, locale);
              return { value: c, label: symbol !== c ? `${symbol} ${name}` : name };
            })}
          />
          <SearchableSelect
            label={t("clients.holidayCountry")}
            hint={t("clients.holidayCountryHint")}
            placeholder={t("clients.selectHolidayCountry")}
            value={holidayCountry}
            onChange={(val) => setHolidayCountry(val as HolidayCountryCode)}
            options={HOLIDAY_COUNTRIES.map((c) => ({
              value: c,
              label: getCountryName(c, locale),
              icon: <CountryFlag code={c} />,
            }))}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              loading={createClient.isPending || updateClient.isPending}
              disabled={!name || !currency || !holidayCountry}
            >
              {editing ? t("common.edit") : t("common.create")}
            </Button>
          </div>
        </form>
      </Modal>
      {dialog}
    </div>
  );
}
