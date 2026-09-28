import { ModalForm } from "../components/Dialog";
import { useFormState } from "../components/Form";
import { InputField } from "../components/Input";
import { useToast } from "../components/Toast";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Platform chrome for examples (not a DS component): what an example's Share, Invite or New … button opens, so the
 * action does something visible (docs/guides/example-patterns.md §3b, harness interaction/action-without-handler).
 * A ModalForm with one field, like Form "Invite to a workspace": submitting validates, closes, confirms with a toast
 * and hands the value back; Cancel, Escape and the scrim close it, and focus returns to the trigger.
 */
export function DemoFieldDialog({ open, onOpenChange, title, description, field, submitLabel, confirm, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** The one field: an email address (Share, Invite) or a name (New project, New page…). */
  field: { kind: "email" | "name"; label: string; placeholder?: string };
  submitLabel: string;
  /** The toast title after a submit, built from the value: "Invite sent to ava@zen.studio". */
  confirm: (value: string) => string;
  onSubmit?: (value: string) => void;
}) {
  const { toast } = useToast();
  const form = useFormState<{ value: string }>({
    initialValues: { value: "" },
    validate: ({ value }) => {
      const text = value.trim();
      if (!text) return { value: field.kind === "email" ? "Enter an email address" : `Enter a ${field.label.toLowerCase()}` };
      return { value: field.kind === "email" && !emailPattern.test(text) ? "Enter a valid email address, like name@company.com" : undefined };
    },
    onSubmit: ({ value }, { reset }) => {
      const text = value.trim();
      onSubmit?.(text);
      onOpenChange(false);
      reset();
      toast({ type: "positive", title: confirm(text) });
    },
  });
  const change = (next: boolean) => { onOpenChange(next); if (!next) form.reset(); };
  return (
    <ModalForm open={open} onOpenChange={change} title={title} description={description} onSubmit={form.handleSubmit}
      primaryAction={{ label: submitLabel }} secondaryAction={{ label: "Cancel" }}>
      <InputField label={field.label} type={field.kind === "email" ? "email" : "text"} autoComplete="off" placeholder={field.placeholder} data-autofocus="" {...form.field("value")} />
    </ModalForm>
  );
}
