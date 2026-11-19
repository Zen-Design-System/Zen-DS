import { useState } from "react";
import {
  Button, Card, Chip, DockIcon, Grid, Heading, InputField, ModalForm, Stack, Text, plural, useFormState, useToast, type DockIconTheme, type IconName,
} from "@zen-ds/react";

type Category = "Product" | "Brand" | "Research";
type Template = { id: string; name: string; summary: string; category: Category; icon: IconName; theme: DockIconTheme; tasks: number; weeks: number };
const templates: Template[] = [
  { id: "app", name: "Mobile app", summary: "Discovery, flows and UI for iOS and Android, with a clickable prototype ready for usability tests.", category: "Product", icon: "icon-mobile-line", theme: "orange", tasks: 18, weeks: 10 },
  { id: "site", name: "Website", summary: "Sitemap, content plan and page designs, handed over as a Zen kit.", category: "Product", icon: "icon-globe-01-line", theme: "blue", tasks: 12, weeks: 6 },
  { id: "brand", name: "Brand refresh", summary: "Audit, moodboards and a new identity: logo, colour, type and tone of voice.", category: "Brand", icon: "icon-palette-line", theme: "green", tasks: 14, weeks: 8 },
  { id: "system", name: "Design system", summary: "Tokens, components and guidelines in Figma and code.", category: "Product", icon: "icon-grid-01-line", theme: "indigo", tasks: 24, weeks: 16 },
  { id: "sprint", name: "Research sprint", summary: "Five interviews and a synthesis workshop in two weeks.", category: "Research", icon: "icon-lightbulb-line", theme: "yellow", tasks: 8, weeks: 2 },
  { id: "usability", name: "Usability test", summary: "Plan, recruit, run and report a moderated test of a product that is already live.", category: "Research", icon: "icon-eye-line", theme: "teal", tasks: 10, weeks: 3 },
  { id: "blueprint", name: "Service blueprint", summary: "Map what customers see and what happens behind it, across every channel from the first visit to support.", category: "Research", icon: "icon-dataflow-01-line", theme: "purple", tasks: 9, weeks: 4 },
  { id: "campaign", name: "Campaign launch", summary: "Key visual, social kit and a landing page for a campaign.", category: "Brand", icon: "icon-rocket-line", theme: "pink", tasks: 11, weeks: 5 },
];
const categories: Category[] = ["Product", "Brand", "Research"];

export default function TemplateGallery() {
  const { toast } = useToast();
  const [category, setCategory] = useState<Category | null>(null);
  const [picked, setPicked] = useState<Template | null>(null);
  const shown = templates.filter((template) => !category || template.category === category);
  // Use template asks for the new project's name: submitting checks it, closes, and a toast confirms.
  const form = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: name.trim() ? undefined : "Enter a project name" }),
    onSubmit: ({ name }, { reset }) => {
      setPicked(null);
      reset();
      toast({ type: "positive", title: `${name.trim()} created` });
    },
  });
  // Cancel, Escape and the scrim close the dialog and clear what was typed.
  const changeOpen = (open: boolean) => {
    if (open) return;
    setPicked(null);
    form.reset();
  };
  return (
    // Toolbar → grid md; the cards md apart.
    <Stack gap="md">
      <Stack direction="row" gap="xs" align="center" wrap>
        <Chip variant="advanced" dropdown selected={category !== null} popoverLabel="Category"
          popoverItems={categories.map((option) => ({ id: option, label: option, selected: option === category }))}
          onPopoverSelect={(item) => setCategory(item.id === category ? null : (item.id as Category))}
          onClearSelection={() => setCategory(null)}>
          {category ?? "Category"}
        </Chip>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(shown.length, "template")}</Text>
      </Stack>
      {/* As many 240px columns as fit, with no breakpoints; every card stretches to the tallest in its row. */}
      <Grid as="ul" minColumnWidth={240} gap="md" aria-label="Project templates">
        {shown.map((template) => (
          <Card as="li" key={template.id} theme="default">
            {/* Two groups lg apart, pushed to the top and bottom of the stretched card: the footers line up across the row. */}
            <Stack gap="lg" justify="between" height="fill">
              <Stack gap="md">
                <DockIcon icon={template.icon} theme={template.theme} background="subtle" />
                <Stack gap="xs">
                  <Heading level={4} textStyle="Heading/Subheading">{template.name}</Heading>
                  <Text textStyle="Body/Small/Regular" tone="base">{template.summary}</Text>
                </Stack>
              </Stack>
              <Stack gap="md">
                <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${plural(template.tasks, "task")} · ${plural(template.weeks, "week")}`}</Text>
                <Button level="tertiary" aria-label={`Use the ${template.name} template`} onClick={() => setPicked(template)}>Use template</Button>
              </Stack>
            </Stack>
          </Card>
        ))}
      </Grid>
      <ModalForm open={picked !== null} onOpenChange={changeOpen} title={`New ${picked?.name.toLowerCase() ?? ""} project`}
        description={picked ? `Starts with the template's ${plural(picked.tasks, "task")}.` : undefined} onSubmit={form.handleSubmit}
        primaryAction={{ label: "Create project" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Project name" type="text" autoComplete="off" placeholder="Saola trail guide" data-autofocus="" {...form.field("name")} />
      </ModalForm>
    </Stack>
  );
}
