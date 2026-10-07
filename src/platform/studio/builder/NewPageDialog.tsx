import { useEffect, useState } from "react";
import { ModalForm } from "../../../components/Dialog";
import { InputField, SelectField } from "../../../components/Input";
import { Segmented } from "../../../components/Segmented";
import { openLocalPage } from "../shell/navigation";
import { loadEngine } from "./engine";
import type { PageDevice } from "./proto/runtime";
import { snapshotTemplate, templateChoices, type TemplateChoice } from "./starters/fromTemplate";
import { pageFromSnapshot } from "./starters/newPageFromFrame";
import { freeId, putPage } from "./store/pageStore";

/*
 * New page (Studio builder GĐ2; spec §5 M1, the user's choice: a blank page on a device): a title and a device, then a
 * page with one Screen holding a padded Stack and its heading, saved in this browser and opened on the canvas.
 * Start from (GĐ3b M3): one of the platform's page templates instead, copied as "New page from this frame" copies a frame
 * (its device is the template's; the title defaults to the template's).
 */

const DEVICES: Array<{ id: PageDevice; label: string }> = [
  { id: "phone", label: "Phone" },
  { id: "tablet", label: "Tablet" },
  { id: "desktop", label: "Desktop" },
];

export function NewPageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [device, setDevice] = useState<PageDevice>("desktop");
  const [start, setStart] = useState("blank");
  const [choices, setChoices] = useState<TemplateChoice[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The templates load with the dialog (their own chunk), not with the Studio.
  useEffect(() => { if (open && !choices) void templateChoices().then(setChoices, () => setChoices([])); }, [open, choices]);
  const template = choices?.find((choice) => choice.id === start) ?? null;
  const reset = () => { setTitle(""); setStart("blank"); setError(null); };
  const create = async () => {
    const name = title.trim();
    if (template) {
      setBusy(true);
      try {
        const result = await snapshotTemplate(template.id);
        const id = result ? await pageFromSnapshot(result.shot, { title: name || result.title, from: `the ${result.title} template` }) : null;
        if (!id) { setError("This template could not be copied: the status line says why"); return; }
        reset();
        onOpenChange(false);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!name) { setError("Give the page a title"); return; }
    const [engine, id] = await Promise.all([loadEngine(), freeId(name)]);
    await putPage(id, engine.newPageText({ title: name, device }), { title: name });
    reset();
    onOpenChange(false);
    openLocalPage(id);
  };
  return (
    <ModalForm
      open={open}
      onOpenChange={(next) => { if (!next) setError(null); onOpenChange(next); }}
      title="New page"
      description={template ? `${template.description} Copied into a page of your own, saved in this browser.` : "A blank page saved in this browser. Add components from Assets or a slot's +."}
      onSubmit={() => create()}
      primaryAction={{ label: busy ? "Creating…" : "Create page", disabled: busy }}
      secondaryAction={{ label: "Cancel" }}
    >
      <SelectField
        label="Start from"
        size="md"
        value={start}
        onValueChange={(next) => { setStart(next); if (error) setError(null); }}
        options={[{ value: "blank", label: "Blank page" }, ...(choices ?? []).map((choice) => ({ value: choice.id, label: `${choice.title}${choice.mobile ? " (phone)" : ""}` }))]}
      />
      <InputField
        label="Title"
        size="md"
        value={title}
        placeholder={template ? template.title : "Checkout"}
        error={Boolean(error)}
        errorMessage={error ?? undefined}
        onChange={(event) => { setTitle(event.target.value); if (error) setError(null); }}
      />
      {template ? null : <Segmented
        aria-label="Device"
        size="md"
        level="secondary"
        fullWidth
        value={device}
        onValueChange={(next) => setDevice(next as PageDevice)}
        options={DEVICES.map((item) => ({ id: item.id, label: item.label }))}
      />}
    </ModalForm>
  );
}
