import { useId, useRef, useState } from "react";
import {
  Avatar, Button, EmptyState, Heading, IconButton, InputField, List, ListBox, ListItem, Menu, ModalForm, Stack, Text, useFormState, useToast, useZen,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatRelative, initials } from "../../data";

type Invite = { id: string; email: string; role: "Member" | "Client guest"; sentAt: Date; resent?: boolean };
const firstInvites: Invite[] = [
  { id: "trang", email: "trang.le@phinco.vn", role: "Client guest", sentAt: daysFromToday(-2, 9, 40) },
  { id: "an", email: "an.vu@dizai.studio", role: "Member", sentAt: daysFromToday(-1, 17, 5) },
  { id: "quan", email: "quan.ho@lumenbank.com", role: "Client guest", sentAt: daysFromToday(-6, 15, 10) },
];
/** "trang.le@phinco.vn" → "TL". */
const emailInitials = (email: string) => initials(email.split("@")[0].replace(/[._-]+/g, " "));
/** "Just now" and "Yesterday at …" read lower-case after a verb: "Invited yesterday at 5:05 pm". */
const afterVerb = (d: Date) => formatRelative(d).replace(/^(Just now|Yesterday)/, (word) => word.toLowerCase());
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Pending invites: trailing actions are their own buttons. */
export default function PendingInvites() {
  const { toast } = useToast();
  const [invites, setInvites] = useState(firstInvites);
  const [inviting, setInviting] = useState(false);
  // On a phone two icon buttons would squeeze the address, so Resend and Revoke move into a ⋯ menu headed by it.
  const narrow = useZen()?.breakpoint === "mobile";
  const titleId = useId();
  // Each invite's first action (Resend, or its ⋯ menu) and Invite people: where focus goes when a row is revoked.
  const actionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const inviteRef = useRef<HTMLButtonElement>(null);
  const resend = (invite: Invite) => {
    setInvites((list) => list.map((item) => (item.id === invite.id ? { ...item, sentAt: TODAY, resent: true } : item)));
    toast({ title: "Invite resent", children: invite.email });
  };
  const revoke = (invite: Invite) => {
    const index = invites.findIndex((item) => item.id === invite.id);
    const rest = invites.filter((item) => item.id !== invite.id);
    const next = rest[Math.min(index, rest.length - 1)];
    setInvites((list) => list.filter((item) => item.id !== invite.id));
    // Undo puts the invite back in its old place.
    const undo = () => setInvites((list) => [...list.slice(0, index), invite, ...list.slice(index)]);
    toast({ title: "Invite revoked", children: invite.email, action: { label: "Undo", onClick: undo } });
    // The row and its buttons are gone: focus moves to the next invite's actions, or to Invite people.
    setTimeout(() => ((next ? actionRefs.current[next.id] : null) ?? inviteRef.current)?.focus());
  };
  // Invite people: one email field; a valid address joins the list and a toast confirms it.
  const invite = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => {
      const text = email.trim();
      if (!text) return { email: "Enter an email address" };
      return { email: emailPattern.test(text) ? undefined : "Enter a valid email address, like name@company.com" };
    },
    onSubmit: ({ email }, { reset }) => {
      const text = email.trim();
      setInvites((list) => [{ id: `${text}-${list.length}`, email: text, role: "Member", sentAt: TODAY }, ...list]);
      setInviting(false);
      reset();
      toast({ type: "positive", title: `Invite sent to ${text}` });
    },
  });
  // Cancel, Escape and the scrim close the dialog and clear what was typed.
  const changeInviting = (open: boolean) => { setInviting(open); if (!open) invite.reset(); };
  return (
    <>
    {/* A ListBox: the title in its Header-Slot, the rows in its Body-Slot, Invite people in its Footer-Slot. */}
    <ListBox as="section" aria-labelledby={titleId}
      header={<Stack gap="2xs">
        <Heading level={4} id={titleId} textStyle="Heading/Subheading">Pending invites</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">Invites expire 14 days after they're sent.</Text>
      </Stack>}
      footer={<Button ref={inviteRef} level="tertiary" startIcon="icon-user-plus-line" onClick={() => setInviting(true)}>Invite people</Button>}>
      {invites.length ? (
        <List aria-labelledby={titleId}>
          {invites.map((item) => (
            <ListItem key={item.id} title={item.email}
              caption={`${item.role} · ${item.resent ? "Resent" : "Invited"} ${afterVerb(item.sentAt)}`}
              leading={<Avatar size="md" theme="neutral" background="subtle" alt="">{emailInitials(item.email)}</Avatar>}
              trailing={narrow ? (
                <Menu align="end" trigger={<IconButton ref={(button) => { actionRefs.current[item.id] = button; }} appearance="flat" level="primary" size="md" icon="icon-dots-horizontal-line" aria-label={`More actions for ${item.email}`} />}
                  items={[{ type: "group", label: item.email, items: [
                    { id: "resend", label: "Resend invite", icon: "icon-send-01-line", onSelect: () => resend(item) },
                    { type: "separator" },
                    { id: "revoke", label: "Revoke invite", icon: "icon-trash-line", danger: true, onSelect: () => revoke(item) },
                  ] }]} />
              ) : <>
                <IconButton ref={(button) => { actionRefs.current[item.id] = button; }} appearance="flat" level="primary" size="md" icon="icon-send-01-line" aria-label={`Resend invite to ${item.email}`} onClick={() => resend(item)} />
                <IconButton appearance="flat" level="primary" size="md" icon="icon-trash-line" aria-label={`Revoke invite for ${item.email}`} onClick={() => revoke(item)} />
              </>} />
          ))}
        </List>
      ) : (
        <EmptyState size="sm" headingLevel={5} icon="icon-users-line" title="No pending invites">
          People you invite show here until they join.
        </EmptyState>
      )}
    </ListBox>
    <ModalForm open={inviting} onOpenChange={changeInviting} title="Invite people"
      description="They join Đìzai Studio as members once they accept." onSubmit={invite.handleSubmit}
      primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
      <InputField label="Email" type="email" autoComplete="off" placeholder="name@company.com" data-autofocus="" {...invite.field("email")} />
    </ModalForm>
    </>
  );
}
