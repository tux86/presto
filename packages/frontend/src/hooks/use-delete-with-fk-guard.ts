import type { UseMutationResult } from "@tanstack/react-query";
import { useCallback } from "react";
import { ApiError } from "@/api/client";
import { useConfirm } from "@/hooks/use-confirm";
import type { TranslationKey } from "@/i18n";

interface DeleteWithFkGuardConfig {
  confirmTitle: string;
  confirmMessage: string;
  fkErrorTitle: string;
  fkErrorMessage: (count: number) => string;
}

export function useDeleteWithFkGuard(
  deleteMutation: UseMutationResult<unknown, Error, string>,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
  config: DeleteWithFkGuardConfig,
) {
  const { confirm, dialog } = useConfirm();

  const handleDelete = useCallback(
    async (id: string) => {
      const ok = await confirm({
        title: config.confirmTitle,
        message: config.confirmMessage,
        confirmLabel: t("common.delete"),
        variant: "danger",
      });
      if (!ok) return;
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        if (err instanceof ApiError && err.code === "FK_CONSTRAINT") {
          await confirm({
            title: config.fkErrorTitle,
            message: config.fkErrorMessage(err.dependentCount ?? 0),
            confirmLabel: t("common.ok"),
          });
        } else {
          throw err;
        }
      }
    },
    [confirm, deleteMutation, config, t],
  );

  return { handleDelete, dialog };
}
