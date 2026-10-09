import { useEffect, useId, useState, type ReactNode } from "react";
import { Card } from "../../../components/Card";
import { Dialog } from "../../../components/Dialog";
import { Icon } from "../../../components/Icon";
import { Text } from "../../../components/Text";
import { openLocalPage } from "../shell/navigation";
import { loadEngine } from "./engine";
import { snapshotTemplate, templateChoices, type TemplateChoice } from "./starters/fromTemplate";
import { pageFromSnapshot } from "./starters/newPageFromFrame";
import { TemplateThumb } from "./starters/TemplateThumb";
import { freeId, listPages, movePage, putPage } from "./store/pageStore";

/*
 * New page (Studio builder GĐ2; spec §5 M1): a blank page on a device, or (GĐ3b M3) one of the platform's page templates
 * copied as "New page from this frame" copies a frame. Visual since 2026-10-09 (user): Start from is a grid of cards —
 * Blank page as a placeholder card, then each template with a scaled-down thumbnail — and the device is three cards
 * drawn in their proportions. Both are radio groups (arrow keys move, the picked card is checked). The page lands in
 * `folder` when the Studio space's folder asked for it. A Dialog, not a ModalForm: the thumbnails are the templates
 * themselves, and some hold a <form> of their own (a form cannot sit in a form); Enter in Title creates the page.
 */

/**
 * One radio card: a Zen Card (Border theme: a Pale frame; Selected: the Card's Active stroke) holding a label whose
 * native radio (hidden) gives the group its keys and its checked state. The Card is not clickable itself (no role=button):
 * the label is the control, so the group stays a radio group.
 */
/** "Untitled page", or "Untitled page 2", 3… while one of that name is kept already. */
async function untitledName(): Promise<string> {
  const taken = new Set((await listPages()).map((page) => page.title));
  let name = "Untitled page";
  for (let n = 2; taken.has(name); n += 1) name = `Untitled page ${n}`;
  return name;
}

function ChoiceCard({ name, value, checked, onPick, children, className }: { name: string; value: string; checked: boolean; onPick: (value: string) => void; children: ReactNode; className?: string }) {
  return (
    <Card theme="border" spacing="sm" selected={checked} className={["studio-choice", className].filter(Boolean).join(" ")}>
      <label className="studio-choice__label">
        <input className="studio-choice__input" type="radio" name={name} value={value} checked={checked} onChange={() => onPick(value)} />
        {children}
      </label>
    </Card>
  );
}

export function NewPageDialog({ open, onOpenChange, folder = null }: { open: boolean; onOpenChange: (open: boolean) => void; folder?: string | null }) {
  const [start, setStart] = useState("blank");
  const [choices, setChoices] = useState<TemplateChoice[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  // The templates load with the dialog (their own chunk), not with the Studio.
  useEffect(() => { if (open && !choices) void templateChoices().then(setChoices, () => setChoices([])); }, [open, choices]);
  const template = choices?.find((choice) => choice.id === start) ?? null;
  const reset = () => { setStart("blank"); setError(null); };
  const pickStart = (next: string) => { setStart(next); if (error) setError(null); };
  // No title or device to fill in first (user, 2026-10-09): a template keeps its own; a blank page is "Untitled page" on a
  // desktop Screen. Both change as you work: the page's Name with nothing selected, a Screen's Device in its frame panel.
  const create = async () => {
    if (template) {
      setBusy(true);
      try {
        const result = await snapshotTemplate(template.id);
        const page = result ? await pageFromSnapshot(result.shot, { title: result.title, from: `the ${result.title} template` }) : null;
        if (!page) { setError("This template could not be copied: the status line says why"); return; }
        if (folder) await movePage(page, folder);
        reset();
        onOpenChange(false);
      } finally {
        setBusy(false);
      }
      return;
    }
    const name = await untitledName();
    const [engine, page] = await Promise.all([loadEngine(), freeId(name)]);
    await putPage(page, engine.newPageText({ title: name, device: "desktop" }), { title: name, folder });
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
      description={template ? `${template.description} Copied into a page of your own, saved in this browser.` : "A desktop page with its app frame (sidebar and page header; on a phone, top and bottom navigation), saved in this browser. Switch each part off, rename the page and change its device as you work."}
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
              <Text as="span" textStyle="Caption/Regular" tone="base">One desktop Screen; change it as you work</Text>
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
      {error ? <Text as="p" textStyle="Body/Small/Regular" tone="negative-base" role="alert">{error}</Text> : null}
    </Dialog>
  );
}
