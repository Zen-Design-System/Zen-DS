import { useEffect, useState } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Dialog } from "../../../components/Dialog";
import { Icon } from "../../../components/Icon";
import { InlineMessage } from "../../../components/InlineMessage";
import { SkeletonShape } from "../../../components/Skeleton";
import { Text } from "../../../components/Text";
import { projectThemeCss } from "../../../../tools/studio/project-theme.mjs";
import { useActiveProject } from "../project/activeProject";
import type { StudioPreviewSettings } from "../types";
import { sharePage, type ShareResult } from "./share";
import "./device.css";

/*
 * Open on phone (user, 2026-10-21: Play on a real phone, "Tương tác (Play)"): Play's bar shares the page with the dev
 * server and shows a QR code of its link. A phone on the same Wi-Fi opens it and plays the page in its own browser, from
 * the Screen Play is on, in Play's modes and the project's theme (device/DevicePlay.tsx). The link works for two hours.
 */

type Props = { page: string; title: string; text: string | undefined; start: string | null; modes: StudioPreviewSettings; brand: string };
type State = { status: "sharing" } | ShareResult;

const timeOf = (time: number) => new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function OpenOnPhone({ page, title, text, start, modes, brand }: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ status: "sharing" });
  const [copied, setCopied] = useState(false);
  const project = useActiveProject();
  const share = async () => {
    if (!text) return;
    setState({ status: "sharing" });
    setCopied(false);
    const themeCss = project ? projectThemeCss(project.id, project.theme, { name: project.name }) : "";
    setState(await sharePage({ title, text, start, modes, brand, themeCss }));
  };
  const link = "ok" in state && state.ok ? state.urls[0] ?? null : null;
  const copy = (value: string) => { void navigator.clipboard?.writeText(value).then(() => setCopied(true), () => setCopied(false)); };
  return (
    <>
      <IconButton appearance="flat" level="primary" size="sm" aria-label="Open on phone" tooltip="Open on phone" icon={<Icon name="icon-qr-code-line" />} disabled={!text} onClick={() => { setOpen(true); void share(); }} />
      <Dialog
        open={open}
        onOpenChange={setOpen}
        className="studio-open-phone"
        icon={false}
        title="Open on phone"
        description="Scan with a phone on the same Wi-Fi."
        secondaryAction={{ label: "Done" }}
      >
        <div className="studio-open-phone__body" data-page={page}>
          {"status" in state ? <SkeletonShape className="studio-open-phone__qr" shape="square" /> : null}
          {"ok" in state && !state.ok ? <InlineMessage theme="negative" action={{ label: "Try again", onClick: () => void share() }}>{state.error}</InlineMessage> : null}
          {link ? <QrCode value={link} /> : null}
          {"ok" in state && state.ok ? (
            <>
              {link ? (
                <div className="studio-open-phone__link">
                  <Text as="p" textStyle="Body/Small/Regular" className="studio-open-phone__url">{link}</Text>
                  <Button appearance="main" level="tertiary" size="sm" startIcon={<Icon name={copied ? "icon-check-line" : "icon-copy-line"} decorative />} onClick={() => copy(link)}>{copied ? "Copied" : "Copy link"}</Button>
                </div>
              ) : null}
              <Text as="p" textStyle="Caption/Regular" tone="light">{`Works until ${timeOf(state.expires)}. If macOS asks, allow node to accept connections.`}</Text>
              {state.urls.length > 1 ? <Text as="p" textStyle="Caption/Regular" tone="light">{`Other networks: ${state.urls.slice(1).join(", ")}`}</Text> : null}
              {state.warning || !link ? <InlineMessage theme="warning">{[state.warning, link ? null : `No network link. On this computer: ${state.local}`].filter(Boolean).join(". ")}</InlineMessage> : null}
            </>
          ) : null}
        </div>
      </Dialog>
    </>
  );
}

/** The link as a QR code, drawn on a light square whatever the theme (phone cameras read dark on light). */
function QrCode({ value }: { value: string }) {
  const [modules, setModules] = useState<boolean[][] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setModules(null);
    import("./qrCode").then(({ qrModules }) => { if (live) setModules(qrModules(value)); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [value]);
  if (failed) return <InlineMessage theme="warning">No QR code here: its package is not installed. Type the link on the phone instead.</InlineMessage>;
  if (!modules) return <SkeletonShape className="studio-open-phone__qr" shape="square" />;
  const size = modules.length;
  const quiet = 4;
  const path = modules.flatMap((row, y) => row.flatMap((dark, x) => (dark ? [`M${x} ${y}h1v1h-1z`] : []))).join("");
  return (
    <svg className="studio-open-phone__qr" data-theme="light" viewBox={`${-quiet} ${-quiet} ${size + quiet * 2} ${size + quiet * 2}`} role="img" aria-label={`QR code of ${value}`} shapeRendering="crispEdges">
      <rect className="studio-open-phone__qr-paper" x={-quiet} y={-quiet} width={size + quiet * 2} height={size + quiet * 2} />
      <path className="studio-open-phone__qr-ink" d={path} />
    </svg>
  );
}
