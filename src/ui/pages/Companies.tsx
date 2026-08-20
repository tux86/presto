import { Building2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Company } from "../../core/types.ts";
import { ApiError, api } from "../api.ts";
import { useConfirm } from "../components/Confirm.tsx";
import { PageHeader } from "../components/Layout.tsx";
import { Badge, Button, Card, EmptyState, ErrorText, Field, Input, Modal, ModalActions } from "../components/ui.tsx";
import { useT } from "../prefs.tsx";
import { useStore } from "../store.tsx";

type Draft = Omit<Company, "id">;

const BLANK: Draft = { name: "", address: null, businessId: null, isDefault: false };

function CompanyForm({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Company | null;
  onClose: () => void;
  onSaved: (company: Company) => void;
}) {
  const { t } = useT();
  const [draft, setDraft] = useState<Draft>(initial ?? BLANK);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      onSaved(initial ? await api.updateCompany(initial.id, draft) : await api.createCompany(draft));
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? initial.name : t("companies.new")}>
      <div className="space-y-3">
        <Field label={t("common.name")}>
          <Input value={draft.name} autoFocus onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label={t("clients.address")}>
          <Input
            value={draft.address ?? ""}
            onChange={(e) => setDraft({ ...draft, address: e.target.value || null })}
          />
        </Field>
        <Field label={t("clients.businessId")}>
          <Input
            value={draft.businessId ?? ""}
            onChange={(e) => setDraft({ ...draft, businessId: e.target.value || null })}
          />
        </Field>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-body">
          <input
            type="checkbox"
            checked={draft.isDefault}
            onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })}
            className="size-4 cursor-pointer accent-[var(--th-accent)]"
          />
          {t("companies.makeDefault")}
        </label>
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

export function Companies() {
  const { t } = useT();
  const { companies, upsertCompany, removeCompany } = useStore();
  const { confirm, dialog } = useConfirm();
  const [editing, setEditing] = useState<Company | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(company: Company) {
    const ok = await confirm({
      title: t("companies.deleteTitle", { name: company.name }),
      message: t("delete.confirm"),
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteCompany(company.id);
      removeCompany(company.id);
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
        title={t("companies.title")}
        subtitle={t("companies.subtitle")}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            {t("companies.new")}
          </Button>
        }
      />

      <ErrorText error={error} />

      {companies.length === 0 ? (
        <EmptyState icon={<Building2 className="size-9" strokeWidth={1.5} />} title={t("companies.empty")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {companies.map((company) => (
            <Card key={company.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium text-heading">{company.name}</div>
                  {company.isDefault ? (
                    <span className="mt-1 inline-block">
                      <Badge tone="accent">
                        <Star className="mr-1 size-3" />
                        {t("companies.default")}
                      </Badge>
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    aria-label={t("common.edit")}
                    onClick={() => {
                      setEditing(company);
                      setOpen(true);
                    }}
                    className="cursor-pointer rounded p-1.5 text-faint hover:bg-elevated hover:text-heading"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("common.delete")}
                    onClick={() => remove(company)}
                    className="cursor-pointer rounded p-1.5 text-faint hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              {company.address ? <p className="mt-2 text-xs text-muted">{company.address}</p> : null}
              {company.businessId ? <p className="mt-0.5 text-xs text-faint">{company.businessId}</p> : null}
            </Card>
          ))}
        </div>
      )}

      {open ? (
        <CompanyForm
          key={editing?.id ?? "new"}
          open={open}
          initial={editing}
          onClose={() => setOpen(false)}
          onSaved={upsertCompany}
        />
      ) : null}
      {dialog}
    </div>
  );
}
