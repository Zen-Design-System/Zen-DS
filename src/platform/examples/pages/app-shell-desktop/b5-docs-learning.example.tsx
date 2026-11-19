import { useId, useRef, useState, type ReactNode, type Ref } from "react";
import {
  AppShell, AppShellHeader, AppShellPane, Avatar, Badge, Box, Breadcrumbs, Button, Divider, EmptyState, Heading, IconButton, InlineMessage, Link, Menu,
  Search, SidebarSubMenu, Stack, Text, useAppShell, useToast,
  type SidebarSection,
} from "@zen-ds/react";

/** Figma Leading-Slots brand: a square Small Avatar (Neutral, Solid) with the product's initial, then its name. */
function Brand({ initial, children }: { initial: string; children: ReactNode }) {
  return (
    <Stack direction="row" gap="xs" align="center">
      <Avatar size="sm" shape="square" theme="neutral" background="solid" alt="">{initial}</Avatar>
      {children}
    </Stack>
  );
}

/** The docs' top-row links. On a wide window Changelog and Community sit beside Get started; once the shell is a drawer
 *  (a phone, a narrow window) three labelled buttons no longer fit beside the brand, so the two links move into More. */
function DocsActions({ onOpen, onGetStarted }: { onOpen: (label: string) => void; onGetStarted: () => void }) {
  const wide = useAppShell()?.layout === "desktop";
  return (
    <>
      {wide ? (
        <>
          <Button appearance="flat" level="primary" onClick={() => onOpen("The changelog")}>Changelog</Button>
          <Button appearance="flat" level="primary" onClick={() => onOpen("Community")}>Community</Button>
        </>
      ) : (
        <Menu align="end" trigger={<IconButton appearance="flat" level="secondary" icon="icon-dots-horizontal-line" aria-label="More" />} items={[
          { id: "changelog", label: "Changelog", icon: "icon-clock-rewind-line", onSelect: () => onOpen("The changelog") },
          { id: "community", label: "Community", icon: "icon-users-line", onSelect: () => onOpen("Community") },
        ]} />
      )}
      <Button level="primary" onClick={onGetStarted}>Get started</Button>
    </>
  );
}

const docsNav: { label: string; items: { id: string; label: string }[] }[] = [
  { label: "Getting started", items: [{ id: "introduction", label: "Introduction" }, { id: "installation", label: "Installation" }, { id: "theming", label: "Theming" }, { id: "ai-kit", label: "AI kit" }] },
  { label: "Foundations", items: [{ id: "colour", label: "Colour" }, { id: "typography", label: "Typography" }, { id: "spacing", label: "Spacing & layout" }] },
  { label: "Components", items: [{ id: "buttons", label: "Buttons" }, { id: "card", label: "Card" }, { id: "table", label: "Table" }] },
];
const onThisPage = [
  { id: "add", label: "Add the package" },
  { id: "wrap", label: "Wrap your app" },
  { id: "import", label: "Import a component" },
  { id: "check", label: "Check your setup" },
  { id: "next", label: "Next steps" },
];

/** Figma Code: Body/Code on Neutral/Pale, Corner-Radius/Large, padding 16 · 20. */
function CodeBlock({ lines }: { lines: string[] }) {
  return (
    <Box surface="pale" radius="lg" paddingX="lg" paddingY="md">
      <Stack gap="sm">{lines.map((line) => <Text key={line} as="code" textStyle="Body/Code/Regular">{line}</Text>)}</Stack>
    </Box>
  );
}

/** A step of the article: Heading/3, then its Body/Base copy (Spacing/Gap/Small apart). The TOC links lead to it and
 *  Get started focuses the first one. */
function DocSection({ id, title, ref, children }: { id: string; title: string; ref?: Ref<HTMLElement>; children: ReactNode }) {
  return (
    <Stack ref={ref} as="section" id={id} gap="sm" tabIndex={-1} aria-labelledby={`${id}-title`}>
      <Heading level={2} textStyle="Heading/3" id={`${id}-title`}>{title}</Heading>
      {children}
    </Stack>
  );
}

/** A docs site, typography-led (Figma ◇ Master-Layout B5, Layout=Docs on Canvas/Flat). */
export default function DocsApp() {
  const { toast } = useToast();
  // Section ids: a useId() without the colons React puts in it, so they work in a link's #hash.
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState("add");
  const [noteOpen, setNoteOpen] = useState(true);
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  // Closing the note leaves a button that brings it back: focus moves there. Get started focuses the first step.
  const reopenRef = useRef<HTMLButtonElement>(null);
  const firstStepRef = useRef<HTMLElement>(null);
  const words = query.trim().toLowerCase();
  // The header Search filters the docs navigation as you type.
  const sections: SidebarSection[] = docsNav
    .map((section) => ({ label: section.label, items: section.items.filter((item) => !words || item.label.toLowerCase().includes(words)).map((item) => ({ ...item, selected: item.id === "installation" })) }))
    .filter((section) => section.items.length > 0);
  const open = (label: string) => toast({ title: `${label} opens in the full docs`, children: "This demo shows the Installation page." });
  const getStarted = () => { setCurrent("add"); firstStepRef.current?.focus(); };
  const closeNote = () => { setNoteOpen(false); setTimeout(() => reopenRef.current?.focus()); };
  return (
    // Docs on Canvas/Flat, typography-led: a 720 reading column between two equal Canvas panes (no box); the only tinted
    // surfaces are the Pale code blocks and the Info callout.
    <AppShell pattern="docs" canvas="flat"
      header={(
        <AppShellHeader
          leading={(
            <Brand initial="Z">
              <Text as="span" textStyle="Heading/4">Zen Docs</Text>
              <Badge size="sm" theme="neutral" background="solid" leadingIcon={false}>v0.4</Badge>
            </Brand>
          )}
          center={<Search placeholder="Search docs" aria-label="Search docs" shortcut="k" value={query} onValueChange={setQuery} />}
          actions={<DocsActions onOpen={open} onGetStarted={getStarted} />}
        />
      )}
      leadingPane={(
        <AppShellPane theme="canvas" aria-label="Documentation">
          {sections.length ? (
            <SidebarSubMenu sections={sections} onItemClick={(item) => { if (item.id !== "installation") open(item.label); }} />
          ) : (
            <EmptyState size="sm" title="No pages match" headingLevel={2} secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>Try another word, like “tokens” or “Card”.</EmptyState>
          )}
        </AppShellPane>
      )}
      trailingPane={(
        <AppShellPane theme="canvas" aria-label="On this page">
          <Stack gap="sm">
            <Box padding="xs"><Text textStyle="All-Caps/S" tone="light">On this page</Text></Box>
            <Stack as="nav" gap="sm" aria-label="On this page">
              {onThisPage.map((item) => (
                // zen-allow-link-underline: Figma "On this page" is a list of plain Body/Small rows; the nav landmark says they are links.
                <Text key={item.id} textStyle={item.id === current ? "Body/Small/Medium" : "Body/Small/Regular"} tone={item.id === current ? "strongest" : "light"}>
                  <Link href={`#${base}-${item.id}`} tone="inherit" underline="hover" aria-current={item.id === current ? "location" : undefined} onClick={() => setCurrent(item.id)}>{item.label}</Link>
                </Text>
              ))}
            </Stack>
            <Divider />
            <Text textStyle="Body/Small/Medium">Was this page helpful?</Text>
            {feedback ? (
              <Text role="status" textStyle="Body/Small/Regular" tone="light">{feedback === "yes" ? "Thanks: glad it helped." : "Thanks: we’ll make this page clearer."}</Text>
            ) : (
              <Stack direction="row" gap="xs">
                {/* zen-allow-vague-label: Figma Yes / No answer "Was this page helpful?" right above them. */}
                <Button level="tertiary" size="sm" onClick={() => setFeedback("yes")}>Yes</Button>
                {/* zen-allow-vague-label: the answer to the question above. */}
                <Button level="tertiary" size="sm" onClick={() => setFeedback("no")}>No</Button>
              </Stack>
            )}
          </Stack>
        </AppShellPane>
      )}
    >
      <Stack gap="xl">
        <Breadcrumbs items={[{ id: "docs", label: "Docs" }, { id: "getting-started", label: "Getting started" }, { id: "installation", label: "Installation" }]}
          onNavigate={(item) => open(item.id === "docs" ? "The docs home" : "Getting started")} />
        {/* The article's sections (the intro, then one per step) are Spacing/Gap/XLarge apart; a step keeps its title,
            copy, code and note together (Figma B5). */}
        <Stack as="article" gap="xl">
          <Stack gap="sm">
            <Heading level={1} textStyle="Display/3">Install Zen in a React app</Heading>
            <Text textStyle="Body/Extra/Regular" tone="base">Zen ships as one package with its tokens, fonts and icons. Five minutes from now your app renders Zen components in light and dark, in English and Vietnamese.</Text>
            <Stack direction="row" gap="xs" align="center">
              <Avatar size="xs" theme="violet" background="subtle" alt="">M</Avatar>
              <Text textStyle="Caption/Regular" tone="light">Maya Chen · Updated Oct 16, 2026 · 4 min read</Text>
            </Stack>
          </Stack>
          <Divider />
          <DocSection ref={firstStepRef} id={`${base}-add`} title="1. Add the package">
            <Text tone="base">Install the library and its peer dependency. The package includes the CSS tokens, so there is nothing else to copy.</Text>
            <CodeBlock lines={["npm install @zen-ds/react react@19"]} />
            {noteOpen ? (
              <InlineMessage theme="info" title="Zen needs React 19" onClose={closeNote}>Components take ref as a prop, so React 18 apps upgrade first.</InlineMessage>
            ) : (
              <Box><Button ref={reopenRef} level="tertiary" size="sm" startIcon="icon-info-circle-line" onClick={() => setNoteOpen(true)}>Show the React 19 note</Button></Box>
            )}
          </DocSection>
          <DocSection id={`${base}-wrap`} title="2. Wrap your app in ZenProvider">
            <Text tone="base">ZenProvider sets the token modes (light or dark, density, locale) and the portal for overlays. Put it once, at the root.</Text>
          </DocSection>
          <DocSection id={`${base}-import`} title="3. Import a component">
            <Text tone="base">Every component reads the provider. Import from the package root; icons take a name or a node.</Text>
            <CodeBlock lines={[`import { Button } from "@zen-ds/react";`, `<Button icon="plus">New task</Button>`]} />
          </DocSection>
          <DocSection id={`${base}-check`} title="4. Check your setup">
            <Text tone="base">The doctor checks the provider, the fonts and the React version, and names what is missing.</Text>
            <CodeBlock lines={["npx zen-ds doctor"]} />
          </DocSection>
          <DocSection id={`${base}-next`} title="Next steps">
            <Text tone="base">Pick a theme in Theming, then build your first screen from a template.</Text>
          </DocSection>
        </Stack>
      </Stack>
    </AppShell>
  );
}
