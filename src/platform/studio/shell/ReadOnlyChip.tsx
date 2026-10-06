import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Text } from "../../../components/Text";
import { useStudioServer } from "../api";
import { editGate, loopbackUrl } from "../gate";
import { studioStore, useStudio } from "../store";
import "./shell.css";

/** The Studio's own storage keys (store.ts): the role, theme, modes and panels, then the session (page, selection, undo). */
const STUDIO_KEYS = { local: ["zen-studio:prefs"], session: ["zen-studio:session", "zen-studio:board-openings"] };

/** Forget the Studio's saved settings and reload: Admin role, light chrome, default modes and panels. */
function resetStudioSettings() {
  try {
    for (const key of STUDIO_KEYS.local) window.localStorage.removeItem(key);
    for (const key of STUDIO_KEYS.session) window.sessionStorage.removeItem(key);
  } catch {
    // Storage may be blocked: the reload still starts from the defaults the store falls back to.
  }
  window.location.reload();
}

/**
 * Read-only chip (toolbar): when the Studio cannot edit, it says so in place and explains why on click, with the fix
 * (Switch to Admin, Open on 127.0.0.1) and "Reset Studio settings". Nothing shows while editing works or the first
 * ping is still out (E2E G-01…G-03).
 */
export function ReadOnlyChip() {
  const role = useStudio((state) => state.role);
  const localPage = useStudio((state) => state.localPage);
  const server = useStudioServer();
  const gate = editGate({ role, localPage }, server, { dev: import.meta.env.DEV, hostname: window.location.hostname });
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  if (gate.ok || gate.reason === "connecting") return null;
  return (
    <div ref={rootRef} className="studio-gate">
      <Button
        ref={triggerRef}
        appearance="flat"
        level="primary"
        size="sm"
        className="studio-gate__chip"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-panel` : undefined}
        aria-label={`Read-only: ${gate.title}`}
        startIcon={<Icon name="icon-eye-line" decorative />}
        onClick={() => setOpen((value) => !value)}
      >
        Read-only
      </Button>
      {open ? (
        <div id={`${id}-panel`} className="studio-gate__panel" role="dialog" aria-labelledby={`${id}-title`}>
          <div className="studio-gate__head">
            <Text as="p" id={`${id}-title`} textStyle="Body/Small/Bold">{gate.title}</Text>
            {gate.detail ? <Text as="p" textStyle="Caption/Regular" tone="base">{gate.detail}</Text> : null}
          </div>
          <div className="studio-gate__actions">
            {gate.reason === "viewer" ? (
              <Button appearance="main" level="primary" size="sm" onClick={() => { studioStore.setState({ role: "admin" }); setOpen(false); }}>Switch to Admin</Button>
            ) : null}
            {gate.reason === "not-loopback" ? (
              <Button appearance="main" level="primary" size="sm" onClick={() => window.location.assign(loopbackUrl(window.location.href))}>Open on 127.0.0.1</Button>
            ) : null}
            <Button appearance="main" level="tertiary" size="sm" onClick={resetStudioSettings}>Reset Studio settings</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
