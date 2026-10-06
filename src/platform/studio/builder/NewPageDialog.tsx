import { useState } from "react";
import { ModalForm } from "../../../components/Dialog";
import { InputField } from "../../../components/Input";
import { Segmented } from "../../../components/Segmented";
import { openLocalPage } from "../shell/navigation";
import { loadEngine } from "./engine";
import type { PageDevice } from "./proto/runtime";
import { freeId, putPage } from "./store/pageStore";

/*
 * New page (Studio builder GĐ2; spec §5 M1, the user's choice: a blank page on a device): a title and a device, then a
 * page with one Screen holding a padded Stack and its heading, saved in this browser and opened on the canvas.
 */

const DEVICES: Array<{ id: PageDevice; label: string }> = [
  { id: "phone", label: "Phone" },
  { id: "tablet", label: "Tablet" },
  { id: "desktop", label: "Desktop" },
];

export function NewPageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [device, setDevice] = useState<PageDevice>("desktop");
  const [error, setError] = useState<string | null>(null);
  const create = async () => {
    const name = title.trim();
    if (!name) { setError("Give the page a title"); return; }
    const [engine, id] = await Promise.all([loadEngine(), freeId(name)]);
    await putPage(id, engine.newPageText({ title: name, device }), name);
    setTitle("");
    setError(null);
    onOpenChange(false);
    openLocalPage(id);
  };
  return (
    <ModalForm
      open={open}
      onOpenChange={(next) => { if (!next) setError(null); onOpenChange(next); }}
      title="New page"
      description="A blank page saved in this browser. Add components from Assets or a slot's +."
      onSubmit={() => create()}
      primaryAction={{ label: "Create page" }}
      secondaryAction={{ label: "Cancel" }}
    >
      <InputField
        label="Title"
        size="md"
        value={title}
        autoFocus
        placeholder="Checkout"
        error={Boolean(error)}
        errorMessage={error ?? undefined}
        onChange={(event) => { setTitle(event.target.value); if (error) setError(null); }}
      />
      <Segmented
        aria-label="Device"
        size="md"
        level="secondary"
        fullWidth
        value={device}
        onValueChange={(next) => setDevice(next as PageDevice)}
        options={DEVICES.map((item) => ({ id: item.id, label: item.label }))}
      />
    </ModalForm>
  );
}
