import { useState } from "react";
import { AppShell, DockIcon, Icon, List, ListItem, TopNavigation, plural, useToast } from "@zen-ds/react";

const sharedFiles = ["Brand refresh deck", "Store photos", "Saola brand audit", "Outdoor range moodboard", "Q4 campaign brief"];

/** Files: Select swaps the bar for a selection bar with the count as its title. */
export default function SelectionMode() {
  const { toast } = useToast();
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const done = () => { setSelecting(false); setPicked([]); };
  const toggle = (name: string) => setPicked((list) => (list.includes(name) ? list.filter((item) => item !== name) : [...list, name]));
  const header = selecting ? (
    <TopNavigation type="alt" title={picked.length ? `${plural(picked.length, "file")} selected` : "Select files"}
      leading={{ icon: "icon-x-medium-line", label: "Cancel", onClick: done }}
      trailing={[
        { icon: "icon-share-01-line", label: "Share", disabled: !picked.length, onClick: () => { toast({ title: `${plural(picked.length, "file")} shared` }); done(); } },
        { icon: "icon-trash-line", label: "Delete", disabled: !picked.length, onClick: () => { toast({ title: `${plural(picked.length, "file")} deleted` }); done(); } },
      ]} />
  ) : (
    <TopNavigation type="alt" title="Files" trailing={[{ icon: "icon-check-circle-line", label: "Select", onClick: () => setSelecting(true) }]} />
  );
  return (
    <AppShell topNavigation={header}>
      <List aria-label="Files">
        {sharedFiles.map((name) => (
          <ListItem key={name} title={name} caption="Shared with the Brand team" leading={<DockIcon icon="icon-file-doc-line" theme="blue" background="subtle" />}
            selected={selecting && picked.includes(name)} trailing={selecting && picked.includes(name) ? <Icon name="icon-check-line" size="base" decorative /> : undefined}
            onClick={selecting ? () => toggle(name) : () => toast({ title: name, children: "Opening files isn't part of this demo." })} />
        ))}
      </List>
    </AppShell>
  );
}
