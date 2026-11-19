import { useId, useState } from "react";
import { DockIcon, Heading, List, ListBox, ToggleListItem, useToast, type IconName } from "@zen-ds/react";

const emailSettings = [
  { id: "digest", title: "Daily digest", caption: "One email at 8:00 am with what changed yesterday", icon: "icon-mail-01-line" as IconName },
  { id: "mentions", title: "Mentions and replies", caption: "When someone mentions you or answers your comment", icon: "icon-message-chat-circle-line" as IconName },
  { id: "invoices", title: "Paid invoices", caption: "When a client pays an invoice you sent", icon: "icon-receipt-line" as IconName },
];

/** Email switches: a row whose whole surface is one switch is a ToggleListItem. */
export default function EmailSwitches() {
  const titleId = useId();
  const { toast } = useToast();
  const [on, setOn] = useState<Record<string, boolean>>({ digest: true, mentions: true, invoices: false });
  const change = (id: string, title: string, checked: boolean) => {
    setOn((current) => ({ ...current, [id]: checked }));
    toast({ title: `${title} ${checked ? "on" : "off"}`, action: { label: "Undo", onClick: () => setOn((current) => ({ ...current, [id]: !checked })) } });
  };
  return (
    <ListBox as="section" aria-labelledby={titleId} header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Email</Heading>}>
      <List aria-labelledby={titleId}>
        {emailSettings.map((setting) => (
          // The whole row is the switch: no Toggle in the trailing slot of a ListItem.
          <ToggleListItem key={setting.id} title={setting.title} caption={setting.caption}
            leading={<DockIcon size="sm" icon={setting.icon} theme="neutral" background="subtle" />}
            checked={on[setting.id]} onCheckedChange={(checked) => change(setting.id, setting.title, checked)} />
        ))}
      </List>
    </ListBox>
  );
}
