import { EyeOff, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Textarea } from "../components/ui.tsx";
import { useT } from "../prefs.tsx";

/** Saves a beat after typing stops, so every keystroke is not a request. */
function useDebounced(value: string, onCommit: (value: string) => void, delay = 600) {
  const [draft, setDraft] = useState(value);
  const committed = useRef(value);

  // Accept changes that came from elsewhere (a reload, a revert).
  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      setDraft(value);
    }
  }, [value]);

  useEffect(() => {
    if (draft === committed.current) return;
    const timer = setTimeout(() => {
      committed.current = draft;
      onCommit(draft);
    }, delay);
    return () => clearTimeout(timer);
  }, [draft, delay, onCommit]);

  return [draft, setDraft] as const;
}

interface Props {
  note: string;
  privateNote: string;
  readOnly: boolean;
  onNote: (value: string) => void;
  onPrivateNote: (value: string) => void;
  className?: string;
}

/**
 * The two notes are deliberately not symmetrical.
 *
 * One is printed on the document the client receives and one never leaves the
 * machine. In v1 they were two identical boxes side by side, which is a trap.
 */
export function Notes({ note, privateNote, readOnly, onNote, onPrivateNote, className }: Props) {
  const { t } = useT();
  const [publicDraft, setPublicDraft] = useDebounced(note, onNote);
  const [privateDraft, setPrivateDraft] = useDebounced(privateNote, onPrivateNote);

  return (
    <div className={className}>
      <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
        <div className="mb-1 flex items-center gap-1.5">
          <FileText className="size-3.5 text-accent-text" />
          <span className="text-sm font-semibold text-heading">{t("note.public")}</span>
        </div>
        <p className="mb-2.5 text-xs text-accent-text">{t("note.publicHint")}</p>
        <Textarea
          value={publicDraft}
          disabled={readOnly}
          maxLength={4000}
          onChange={(e) => setPublicDraft(e.target.value)}
          placeholder={t("note.publicPlaceholder")}
        />
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-edge-strong bg-elevated/60 p-4">
        <div className="mb-1 flex items-center gap-1.5">
          <EyeOff className="size-3.5 text-faint" />
          <span className="text-sm font-semibold text-muted">{t("note.private")}</span>
        </div>
        <p className="mb-2.5 text-xs text-faint">{t("note.privateHint")}</p>
        <Textarea
          value={privateDraft}
          maxLength={4000}
          onChange={(e) => setPrivateDraft(e.target.value)}
          placeholder={t("note.privatePlaceholder")}
          className="bg-panel/60"
        />
      </div>
    </div>
  );
}
