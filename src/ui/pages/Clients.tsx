import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { countryFlag, countryName } from "../../core/countries.ts";
import { CLIENT_COLORS, type Client, type ClientColor } from "../../core/types.ts";
import { ApiError, api } from "../api.ts";
import { useConfirm } from "../components/Confirm.tsx";
import { PageHeader } from "../components/Layout.tsx";
import {
  Button,
  Card,
  ComboInput,
  EmptyState,
  ErrorText,
  Field,
  Input,
  Modal,
  ModalActions,
} from "../components/ui.tsx";
import { COLORS, CURRENCIES, cn, colorOf, currencyLabel } from "../format.ts";
import { useT } from "../prefs.tsx";
import { useStore } from "../store.tsx";

type Draft = Omit<Client, "id">;

const BLANK: Draft = {
  name: "",
  email: null,
  phone: null,
  address: null,
  businessId: null,
  color: null,
  currency: "EUR",
  holidayCountry: "FR",
};

function ClientForm({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Client | null;
  onClose: () => void;
  onSaved: (client: Client) => void;
}) {
  const { t, locale } = useT();
  const { countries } = useStore();
  const [draft, setDraft] = useState<Draft>(initial ?? BLANK);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      onSaved(initial ? await api.updateClient(initial.id, draft) : await api.createClient(draft));
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? initial.name : t("clients.new")} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("common.name")} className="sm:col-span-2">
          <Input value={draft.name} autoFocus onChange={(e) => set("name", e.target.value)} />
        </Field>

        <Field label={t("clients.currency")}>
          <ComboInput
            value={draft.currency}
            onChange={(v) => set("currency", v.slice(0, 3).toUpperCase())}
            options={CURRENCIES.map((c) => ({ value: c, label: currencyLabel(c, locale) }))}
          />
        </Field>

        <Field label={t("clients.country")} hint={t("clients.countryHint")}>
          <ComboInput
            value={draft.holidayCountry}
            onChange={(v) => set("holidayCountry", v.slice(0, 2).toUpperCase())}
            options={countries.map((c) => ({ value: c, label: `${countryFlag(c)} ${countryName(c, locale)}` }))}
          />
        </Field>

        <Field label={t("clients.email")}>
          <Input type="email" value={draft.email ?? ""} onChange={(e) => set("email", e.target.value || null)} />
        </Field>
        <Field label={t("clients.phone")}>
          <Input value={draft.phone ?? ""} onChange={(e) => set("phone", e.target.value || null)} />
        </Field>
        <Field label={t("clients.address")} className="sm:col-span-2">
          <Input value={draft.address ?? ""} onChange={(e) => set("address", e.target.value || null)} />
        </Field>
        <Field label={t("clients.businessId")} className="sm:col-span-2">
          <Input value={draft.businessId ?? ""} onChange={(e) => set("businessId", e.target.value || null)} />
        </Field>

        <Field label={t("clients.color")} className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {CLIENT_COLORS.map((color: ClientColor) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                aria-pressed={draft.color === color}
                onClick={() => set("color", draft.color === color ? null : color)}
                className={cn(
                  "size-7 cursor-pointer rounded-full transition-transform",
                  COLORS[color].dot,
                  draft.color === color
                    ? "scale-110 ring-2 ring-accent ring-offset-2 ring-offset-panel"
                    : "opacity-70 hover:opacity-100",
                )}
              />
            ))}
          </div>
        </Field>
      </div>

      <ErrorText error={error} />
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button busy={busy} disabled={!draft.name.trim()} onClick={submit}>
          {t("common.save")}
        </Button>
      </ModalActions>
    </Modal>
  );
}

export function Clients() {
  const { t, locale } = useT();
  const { clients, upsertClient, removeClient } = useStore();
  const { confirm, dialog } = useConfirm();
  const [editing, setEditing] = useState<Client | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(client: Client) {
    const ok = await confirm({
      title: t("clients.deleteTitle", { name: client.name }),
      message: t("delete.confirm"),
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteClient(client.id);
      removeClient(client.id);
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "IN_USE"
          ? t("delete.inUseMessage", { count: e.count ?? 0, entity: t("nav.missions").toLowerCase() })
          : String(e),
      );
    }
  }

  return (
    <div>
      <PageHeader
        title={t("clients.title")}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            {t("clients.new")}
          </Button>
        }
      />

      <ErrorText error={error} />

      {clients.length === 0 ? (
        <EmptyState icon={<Users className="size-9" strokeWidth={1.5} />} title={t("clients.empty")} />
      ) : (
        <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="flex h-full flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn("size-2.5 shrink-0 rounded-full", COLORS[colorOf(client.name, client.color)].dot)}
                  />
                  <span className="truncate font-medium text-heading">{client.name}</span>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    aria-label={t("common.edit")}
                    onClick={() => {
                      setEditing(client);
                      setOpen(true);
                    }}
                    className="cursor-pointer rounded p-1.5 text-faint hover:bg-elevated hover:text-heading"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("common.delete")}
                    onClick={() => remove(client)}
                    className="cursor-pointer rounded p-1.5 text-faint hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-xs text-muted">
                <div className="flex gap-2">
                  <dt className="text-faint">{t("clients.currency")}</dt>
                  <dd className="tabular">{client.currency}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-faint">{t("clients.country")}</dt>
                  <dd>
                    {countryFlag(client.holidayCountry)} {countryName(client.holidayCountry, locale)}
                  </dd>
                </div>
                {client.email ? <div className="truncate">{client.email}</div> : null}
                {client.businessId ? <div className="truncate text-faint">{client.businessId}</div> : null}
              </dl>
            </Card>
          ))}
        </div>
      )}

      {open ? (
        <ClientForm
          key={editing?.id ?? "new"}
          open={open}
          initial={editing}
          onClose={() => setOpen(false)}
          onSaved={upsertClient}
        />
      ) : null}
      {dialog}
    </div>
  );
}
