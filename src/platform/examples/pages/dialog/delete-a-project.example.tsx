import { useRef, useState } from "react";
import { Card, Dialog, DockIcon, EmptyState, Form, Heading, IconButton, InputField, List, ListItem, Stack, Text, plural, useToast, useZen, type DockIconTheme, type IconName } from "@zen-ds/react";
import { daysFromToday, formatDate } from "../../data";

type DoneProject = { id: string; name: string; client: string; icon: IconName; theme: DockIconTheme; files: number; finished: Date };
const doneProjects: DoneProject[] = [
  { id: "bookfair-site", name: "Book Fair 2026 website", client: "Hanoi Book Fair", icon: "icon-book-open-line", theme: "purple", files: 214, finished: daysFromToday(-12) },
  { id: "phin-tet", name: "Tết campaign microsite", client: "Phin & Co", icon: "icon-gift-01-line", theme: "orange", files: 86, finished: new Date(2026, 1, 20) },
  { id: "lumen-report", name: "Annual report 2025", client: "Lumen Bank", icon: "icon-file-chart-line", theme: "blue", files: 42, finished: new Date(2026, 3, 8) },
];

/** Completed projects: deleting one can't be undone, so a negative Dialog asks for its name first. */
export default function DeleteProject() {
  const { toast } = useToast();
  // ListItem titles stay on one line: on a phone the Contents slot lets a long name wrap instead of being cut.
  const narrow = useZen()?.breakpoint === "mobile";
  const titleRef = useRef<HTMLHeadingElement>(null);
  const deleteRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [rows, setRows] = useState(doneProjects);
  const [target, setTarget] = useState(doneProjects[0]);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const matches = typed.trim() === target.name;
  const ask = (project: DoneProject) => { setTarget(project); setTyped(""); setMismatch(false); setOpen(true); };
  const remove = () => {
    const rest = rows.filter((project) => project.id !== target.id);
    setRows(rest);
    setOpen(false);
    toast({ title: "Project deleted" });
    // The trash button that opened the dialog is gone: focus the first one left, or the title once the list is empty.
    setTimeout(() => (rest.length ? deleteRefs.current[rest[0].id] : titleRef.current)?.focus());
  };
  return (
    <Card theme="default" spacing="md" width="fill">
      <Stack gap="md">
        <Heading ref={titleRef} tabIndex={-1} level={4} textStyle="Heading/Subheading">Completed projects</Heading>
        {rows.length ? (
          <List aria-label="Completed projects">
            {rows.map((project) => {
              const caption = `${project.client} · finished ${formatDate(project.finished)}`;
              return (
                <ListItem key={project.id} title={project.name} caption={narrow ? undefined : caption}
                  leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
                  trailing={<IconButton ref={(button) => { deleteRefs.current[project.id] = button; }} appearance="flat" size="md" icon="icon-trash-line"
                    aria-label={`Delete ${project.name}`} onClick={() => ask(project)} />}>
                  {narrow ? (
                    <>
                      <Text as="span" textStyle="Body/Base/Bold">{project.name}</Text>
                      <Text as="span" textStyle="Body/Small/Regular" tone="light">{caption}</Text>
                    </>
                  ) : undefined}
                </ListItem>
              );
            })}
          </List>
        ) : (
          <EmptyState size="sm" headingLevel={5} icon="icon-folder-line" title="No completed projects">Projects move here when they're marked Completed.</EmptyState>
        )}
      </Stack>
      <Dialog open={open} onOpenChange={setOpen} theme="negative" title="Delete this project?"
        description={`${target.name}, its ${plural(target.files, "file")} and every comment are deleted for everyone. This can't be undone.`}
        primaryAction={{ label: "Delete project", level: "danger", disabled: !matches, onClick: remove }}
        secondaryAction={{ label: "Cancel" }}>
        {/* Enter in the field confirms once the name matches; before that it says what is missing. */}
        <Form onSubmit={() => (matches ? remove() : setMismatch(true))}>
          <InputField label="Project name" helpText={`Type “${target.name}” to confirm.`} autoComplete="off" value={typed}
            onValueChange={(value) => { setTyped(value); setMismatch(false); }} error={mismatch ? `Type “${target.name}” exactly as shown.` : undefined} />
        </Form>
      </Dialog>
    </Card>
  );
}
