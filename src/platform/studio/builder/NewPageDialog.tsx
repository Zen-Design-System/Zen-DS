import { useEffect, useId, useState, type ReactNode } from "react";
import { Dialog } from "../../../components/Dialog";
import { Icon } from "../../../components/Icon";
import { InputField } from "../../../components/Input";
import { Text } from "../../../components/Text";
import { openLocalPage } from "../shell/navigation";
import { loadEngine } from "./engine";
import { DEVICE_WIDTH, type PageDevice } from "./proto/runtime";
import { snapshotTemplate, templateChoices, type TemplateChoice } from "./starters/fromTemplate";
import { pageFromSnapshot } from "./starters/newPageFromFrame";
import { TemplateThumb } from "./starters/TemplateThumb";
import { freeId, movePage, putPage } from "./store/pageStore";

/*
 * New page (Studio builder GĐ2; spec §5 M1): a blank page on a device, or (GĐ3b M3) one of the platform's page templates
 * copied as "New page from this frame" copies a frame. Visual since 2026-10-09 (user): Start from is a grid of cards —
 * Blank page as a placeholder card, then each template with a scaled-down thumbnail — and the device is three cards
 * drawn in their proportions. Both are radio groups (arrow keys move, the picked card is checked). The page lands in
 * `folder` when the Studio space's folder asked for it. A Dialog, not a ModalForm: the thumbnails are the templates
 * themselves, and some hold a <form> of their own (a form cannot sit in a form); Enter in Title creates the page.
 */

const DEVICES: Array<{ id: PageDevice; label: string }> = [
  { id: "phone", label: "Phone" },
  { id: "tablet", label: "Tablet" },
  { id: "desktop", label: "Desktop" },
];

/** One radio card: the native radio (hidden) gives the group its keys and its checked state. */
function ChoiceCard({ name, value, checked, onPick, children, className }: { name: string; value: string; checked: boolean; onPick: (value: string) => void; children: ReactNode; className?: string }) {
  return (
    <label className={["studio-choice", className].filter(Boolean).join(" ")} data-checked={checked ? "true" : undefined}>
      <input className="studio-choice__input" type="radio" name={name} value={value} checked={checked} onChange={() => onPick(value)} />
      {children}
    </label>
  );
}

export function NewPageDialog({ open, onOpenChange, folder = null }: { open: boolean; onOpenChange: (open: boolean) => void; folder?: string | null }) {
  const [title, setTitle] = useState("");
  const [device, setDevice] = useState<PageDevice>("desktop");
  const [start, setStart] = useState("blank");
  const [choices, setChoices] = useState<TemplateChoice[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  // The templates load with the dialog (their own chunk), not with the Studio.
  useEffect(() => { if (open && !choices) void templateChoices().then(setChoices, () => setChoices([])); }, [open, choices]);
  const template = choices?.find((choice) => choice.id === start) ?? null;
  const reset = () => { setTitle(""); setStart("blank"); setError(null); };
  const pickStart = (next: string) => { setStart(next); if (error) setError(null); };
  const create = async () => {
    const name = title.trim();
    if (template) {
      setBusy(true);
      try {
        const result = await snapshotTemplate(template.id);
        const page = result ? await pageFromSnapshot(result.shot, { title: name || result.title, from: `the ${result.title} template` }) : null;
        if (!page) { setError("This template could not be copied: the status line says why"); return; }
        if (folder) await movePage(page, folder);
        reset();
        onOpenChange(false);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!name) { setError("Give the page a title"); return; }
    const [engine, page] = await Promise.all([loadEngine(), freeId(name)]);
    await putPage(page, engine.newPageText({ title: name, device }), { title: name, folder });
    reset();
    onOpenChange(false);
    openLocalPage(page);
  };
  return (
    <Dialog
      open={open}
      icon={false}
      className="studio-new-page"
      onOpenChange={(next) => { if (!next) setError(null); onOpenChange(next); }}
      title="New page"
      description={template ? `${template.description} Copied into a page of your own, saved in this browser.` : "A blank page saved in this browser. Add components from Assets or a slot's +."}
      primaryAction={{ label: busy ? "Creating…" : "Create page", disabled: busy, onClick: () => void create() }}
      secondaryAction={{ label: "Cancel" }}
    >
      <fieldset className="studio-new-page__group">
        <legend className="studio-new-page__legend"><Text as="span" textStyle="Body/Base/Bold">Start from</Text></legend>
        <div className="studio-new-page__templates">
          <ChoiceCard name={`${id}-start`} value="blank" checked={start === "blank"} onPick={pickStart} className="studio-choice--template">
            <span className="studio-choice__blank" aria-hidden="true"><Icon name="icon-plus-line" size="base" decorative /></span>
            <span className="studio-choice__text">
              <Text as="span" textStyle="Body/Small/Bold">Blank page</Text>
              <Text as="span" textStyle="Caption/Regular" tone="base">One Screen on the device you pick</Text>
            </span>
          </ChoiceCard>
          {(choices ?? []).map((choice) => (
            <ChoiceCard key={choice.id} name={`${id}-start`} value={choice.id} checked={start === choice.id} onPick={pickStart} className="studio-choice--template">
              <TemplateThumb id={choice.id} mobile={choice.mobile} />
              <span className="studio-choice__text">
                <Text as="span" textStyle="Body/Small/Bold" className="studio-choice__title">{choice.title}</Text>
                <Text as="span" textStyle="Caption/Regular" tone="base">{choice.mobile ? "Phone template" : "Desktop template"}</Text>
              </span>
            </ChoiceCard>
          ))}
        </div>
      </fieldset>
      <InputField
        label="Title"
        size="md"
        value={title}
        placeholder={template ? template.title : "Checkout"}
        error={Boolean(error)}
        errorMessage={error ?? undefined}
        onChange={(event) => { setTitle(event.target.value); if (error) setError(null); }}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void create(); } }}
      />
      {template ? null : (
        <fieldset className="studio-new-page__group">
          <legend className="studio-new-page__legend"><Text as="span" textStyle="Body/Base/Bold">Device</Text></legend>
          <div className="studio-new-page__devices">
            {DEVICES.map((item) => (
              <ChoiceCard key={item.id} name={`${id}-device`} value={item.id} checked={device === item.id} onPick={(next) => setDevice(next as PageDevice)} className="studio-choice--device">
                {/* The device drawn in its proportions (phone 9:19.5, tablet 3:4, desktop 16:10). */}
                <span className="studio-choice__device" data-device={item.id} aria-hidden="true" />
                <span className="studio-choice__text">
                  <Text as="span" textStyle="Body/Small/Bold">{item.label}</Text>
                  <Text as="span" textStyle="Caption/Regular" tone="base">{DEVICE_WIDTH[item.id]} px wide</Text>
                </span>
              </ChoiceCard>
            ))}
          </div>
        </fieldset>
      )}
    </Dialog>
  );
}
