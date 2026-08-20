import { type ReactNode, useCallback, useRef, useState } from "react";
import { useT } from "../prefs.tsx";
import { Button, Modal, ModalActions } from "./ui.tsx";

interface Ask {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}

/**
 * Promise-based confirmation.
 *
 *   const { confirm, dialog } = useConfirm();
 *   if (await confirm({ title: "Delete?" })) …
 *   return <>{dialog}</>;
 */
export function useConfirm(): { confirm: (ask: Ask) => Promise<boolean>; dialog: ReactNode } {
  const [ask, setAsk] = useState<Ask | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const { t } = useT();

  const confirm = useCallback((next: Ask) => {
    setAsk(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setAsk(null);
  }, []);

  const dialog = (
    <Modal open={ask !== null} onClose={() => settle(false)} title={ask?.title ?? ""}>
      {ask?.message ? <p className="text-sm leading-relaxed text-muted">{ask.message}</p> : null}
      <ModalActions>
        <Button variant="ghost" onClick={() => settle(false)}>
          {t("common.cancel")}
        </Button>
        <Button variant={ask?.danger ? "danger" : "primary"} onClick={() => settle(true)}>
          {ask?.confirmLabel ?? t("common.delete")}
        </Button>
      </ModalActions>
    </Modal>
  );

  return { confirm, dialog };
}
