import { useId, useRef, useState } from "react";
import {
  Avatar, Box, Button, EmptyState, Heading, IconButton, InputField, ModalForm, Stack, Table, TableActions, TableMedia, TableText, Text, VisuallyHidden,
  useFormState, useToast, type TableColumn,
} from "@zen-ds/react";
import { TODAY, formatRelative } from "../../data";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* An empty table that starts the job. */
type Guest = { id: string; email: string; invited: Date };

export default function Guests() {
  const { toast } = useToast();
  const headingId = useId();
  const inviteButton = useRef<HTMLButtonElement>(null);
  const emptyTitle = useRef<HTMLSpanElement>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [inviting, setInviting] = useState(false);
  // Invite guest moves between the empty state and the header, and a removed row takes its button with it: focus
  // follows to the header's Invite guest, or to the empty state that takes its place, never to <body>.
  const invite = (email: string) => {
    setGuests((list) => [...list, { id: email, email, invited: TODAY }]);
    setTimeout(() => inviteButton.current?.focus());
  };
  const remove = (guest: Guest) => {
    const before = guests;
    const rest = guests.filter((item) => item.id !== guest.id);
    setGuests(rest);
    toast({ title: "Guest removed", action: { label: "Undo", onClick: () => setGuests(before) } });
    setTimeout(() => (rest.length ? inviteButton.current : emptyTitle.current)?.focus());
  };
  // Invite a guest: one email field; a valid address adds the guest and a toast confirms it.
  const form = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => {
      const text = email.trim();
      if (!text) return { email: "Enter an email address" };
      return { email: emailPattern.test(text) ? undefined : "Enter a valid email address, like name@company.com" };
    },
    onSubmit: ({ email }, { reset }) => {
      const text = email.trim();
      invite(text);
      setInviting(false);
      reset();
      toast({ type: "positive", title: `Invite sent to ${text}` });
    },
  });
  // Cancel, Escape and the scrim close the dialog and clear what was typed.
  const changeInviting = (open: boolean) => { setInviting(open); if (!open) form.reset(); };
  const columns: TableColumn<Guest>[] = [
    { id: "guest", header: "Guest", cell: (guest) => <TableMedia bold media={<Avatar size="sm" theme="green" alt="">{guest.email[0].toUpperCase()}</Avatar>} caption="Can comment">{guest.email}</TableMedia> },
    { id: "invited", header: "Invited", width: "150px", cell: (guest) => <TableText>{formatRelative(guest.invited)}</TableText> },
    { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "72px", cell: (guest) => (
      <TableActions><IconButton appearance="flat" level="primary" size="md" icon="icon-trash-line" aria-label={`Remove ${guest.email}`} onClick={() => remove(guest)} /></TableActions>
    ) },
  ];
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack direction="row" justify="between" align="center" gap="sm">
        <Stack gap="xs">
          <Heading level={4} id={headingId} textStyle="Heading/4">Guests</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Brand refresh · Saola Outdoor</Text>
        </Stack>
        {/* Once the table has rows, the empty state's action moves up here. */}
        {guests.length ? <Button ref={inviteButton} level="tertiary" startIcon="icon-user-plus-line" onClick={() => setInviting(true)}>Invite guest</Button> : null}
      </Stack>
      {/* Fixed columns scroll sideways on a narrow screen, and the empty row spans every column. The scroll box is the size
          container, so the Empty State's wrapper takes the visible width and stays in view while the row scrolls. */}
      <Table aria-labelledby={headingId} columns={columns} rows={guests} style={{ containerType: "inline-size" }}
        empty={(
          <Box style={{ position: "sticky", insetInlineStart: "var(--zen-spacing-padding-medium, 16px)", width: "calc(100cqi - 2 * var(--zen-spacing-padding-medium, 16px))" }}>
            <EmptyState headingLevel={5} illustration icon="icon-users-line" title={<span ref={emptyTitle} tabIndex={-1}>No guests yet</span>}
              primaryAction={{ label: "Invite guest", onClick: () => setInviting(true) }}>
              Invite people from Saola Outdoor to review designs and leave comments.
            </EmptyState>
          </Box>
        )} />
      <ModalForm open={inviting} onOpenChange={changeInviting} title="Invite a guest" description="Guests can view Brand refresh and comment on designs."
        onSubmit={form.handleSubmit} primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email" type="email" autoComplete="off" placeholder="name@saola.vn" data-autofocus="" {...form.field("email")} />
      </ModalForm>
    </Stack>
  );
}
