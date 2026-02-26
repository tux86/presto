import type { Client, ClientColorKey, CurrencyCode, HolidayCountryCode } from "@presto/shared";
import {
  CLIENT_COLOR_KEYS,
  CURRENCIES,
  getCountryName,
  getCurrencyName,
  getCurrencySymbol,
  HOLIDAY_COUNTRIES,
} from "@presto/shared";
import { Users as UsersIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { DeleteIconButton } from "@/components/ui/DeleteIconButton";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { useClients, useCreateClient, useDeleteClient, useUpdateClient } from "@/hooks/use-clients";
import { useDeleteWithFkGuard } from "@/hooks/use-delete-with-fk-guard";
import { useT } from "@/i18n";
import { CLIENT_COLOR_MAP, cn, getClientColor } from "@/lib/utils";

function CountryFlag({ code }: { code: string }) {
  return <span className={`fi fi-${code.toLowerCase()} fis`} />;
}

export function Clients() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [color, setColor] = useState<ClientColorKey | "">("");
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");
  const [holidayCountry, setHolidayCountry] = useState<HolidayCountryCode>("");

  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const { t, locale } = useT();

  const { handleDelete, dialog } = useDeleteWithFkGuard(deleteClient, t, {
    confirmTitle: t("clients.deleteTitle"),
    confirmMessage: t("clients.deleteMessage"),
    fkErrorTitle: t("common.deleteErrorTitle"),
    fkErrorMessage: (count) => t("clients.deleteError", { count }),
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setBusinessId("");
    setColor("");
    setCurrency("");
    setHolidayCountry("");
    setShowModal(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      openCreate();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, openCreate]);

  const openEdit = (client: Client) => {
    setEditing(client);
    setName(client.name);
    setEmail(client.email || "");
    setPhone(client.phone || "");
    setAddress(client.address || "");
    setBusinessId(client.businessId || "");
    setColor(client.color || "");
    setCurrency(client.currency);
    setHolidayCountry(client.holidayCountry);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !currency || !holidayCountry) return;
    const base = {
      name,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
      businessId: businessId || undefined,
      currency,
      holidayCountry,
    };
    if (editing) {
      await updateClient.mutateAsync({ id: editing.id, ...base, color: color || null });
    } else {
      await createClient.mutateAsync({ ...base, color: color || undefined });
    }
    setShowModal(false);
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
          emptyIcon={<UsersIcon className="h-10 w-10 text-faint" strokeWidth={1.5} />}
          onRowClick={openEdit}
          mobileRender={(c) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="font-medium text-heading inline-flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", getClientColor(c.name, c.color).dot)} />
                  {c.name}
                </span>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                  <span>
                    {getCurrencySymbol(c.currency, locale)} {c.currency}
                  </span>
                  <span>&middot;</span>
                  <span>
                    <CountryFlag code={c.holidayCountry} /> {c.holidayCountry}
                  </span>
                </div>
              </div>
              <DeleteIconButton onClick={() => handleDelete(c.id)} title={t("common.delete")} />
            </div>
          )}
          columns={[
            {
              key: "name",
              header: t("clients.name"),
              render: (c) => (
                <span className="font-medium text-heading inline-flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", getClientColor(c.name, c.color).dot)} />
                  {c.name}
                </span>
              ),
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
              render: (c) => <DeleteIconButton onClick={() => handleDelete(c.id)} title={t("common.delete")} />,
            },
          ]}
        />
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? t("clients.editClient") : t("clients.newClient")}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name — full width */}
          <div className="sm:col-span-2">
            <Input label={t("clients.name")} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          {/* Contact — two columns */}
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
          <Input
            label={t("clients.businessId")}
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            placeholder="123 456 789 01234"
            optional
          />

          {/* Color picker — full width */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-heading mb-1.5">{t("clients.color")}</label>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setColor("")}
                className={cn(
                  "h-7 px-2 rounded-full text-xs font-medium transition-all cursor-pointer border",
                  color === ""
                    ? "border-accent bg-accent/10 text-accent ring-2 ring-offset-2 ring-offset-panel ring-accent"
                    : "border-edge bg-surface text-muted hover:border-faint",
                )}
              >
                {t("common.auto")}
              </button>
              {CLIENT_COLOR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(key)}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all cursor-pointer",
                    CLIENT_COLOR_MAP[key].dot,
                    color === key && "ring-2 ring-offset-2 ring-offset-panel ring-accent",
                  )}
                />
              ))}
            </div>
          </div>

          {/* Separator */}
          <div className="sm:col-span-2 border-t border-edge" />

          {/* Settings — two columns */}
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

          {/* Buttons — full width */}
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
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
