import { useState } from "react";
import { Button } from "../../components/Button";
import { FileIcon, fileIconFormatOf } from "../../components/FileIcon";
import { Icon } from "../../components/Icon";
import { Card } from "../../components/Card";
import { Grid, Stack } from "../../components/Layout";
import { ZenProvider } from "../../components/Provider";
import { Heading, Text, plural, textTones, type HeadingLevel, type TextTone } from "../../components/Text";
import { TopNavigation } from "../../components/TopNavigation";
import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import { PlatformPhone } from "../PlatformPhone";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, option } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";

const styleNames = Object.keys(typographyStyles) as TypographyStyleName[];
const playgroundTones = textTones.filter((tone) => !["primary", "secondary", "tertiary"].includes(tone));

function TextPlayground() {
  const [heading, setHeading] = useState(false);
  const [level, setLevel] = useState<HeadingLevel>(2);
  const [textStyle, setTextStyle] = useState<TypographyStyleName>("Body/Base/Regular");
  const [tone, setTone] = useState<TextTone>("strongest");
  const [truncate, setTruncate] = useState(false);
  const copy = heading ? "Quarterly planning" : "Plan the quarter with your team: goals, owners and dates in one place, so everyone knows what ships next and why it matters.";
  const styleProp = heading ? (textStyle.startsWith("Heading/") || textStyle.startsWith("Display") ? ` textStyle="${textStyle}"` : "") : textStyle === "Body/Base/Regular" ? "" : ` textStyle="${textStyle}"`;
  const toneProp = tone === "strongest" ? "" : ` tone="${tone}"`;
  return (
    <Panel
      title="Text"
      controls={<>
        <PlaygroundToggle label="Heading" selected={heading} onChange={(on) => { setHeading(on); setTextStyle(on ? "Heading/2" : "Body/Base/Regular"); }} />
        {heading ? <PlaygroundFilterChip label="Level" value={String(level)} onChange={(value) => setLevel(Number(value || 2) as HeadingLevel)} options={["1", "2", "3", "4", "5", "6"].map((id) => option(id, `h${id}`))} /> : null}
        <PlaygroundFilterChip label="Text style" value={textStyle} onChange={(value) => setTextStyle((String(value) || "Body/Base/Regular") as TypographyStyleName)} options={styleNames.map((id) => option(id))} />
        <PlaygroundFilterChip label="Tone" value={tone} onChange={(value) => setTone((String(value) || "strongest") as TextTone)} options={playgroundTones.map((id) => option(id))} />
        <PlaygroundToggle label="Truncate" selected={truncate} onChange={setTruncate} />
      </>}
      code={heading
        ? `import { Heading } from "@zen/design-system";\n\n<Heading level={${level}}${styleProp}${toneProp}${truncate ? " truncate" : ""}>${copy}</Heading>`
        : `import { Text } from "@zen/design-system";\n\n<Text${styleProp}${toneProp}${truncate ? " truncate" : ""}>${copy}</Text>`}
    >
      <div className="pat-stage">
        {heading
          ? <Heading level={level} textStyle={textStyle} tone={tone} truncate={truncate}>{copy}</Heading>
          : <Text textStyle={textStyle} tone={tone} truncate={truncate}>{copy}</Text>}
      </div>
    </Panel>
  );
}

/* ───────────── Examples ───────────── */

function PageOutlineExample() {
  return (
    <Stack gap="lg">
      <Stack gap="2xs">
        <Heading level={1}>Billing</Heading>
        <Text tone="base">Plan, payment method and invoices for Zen Studio.</Text>
      </Stack>
      <Stack gap="xs">
        <Heading level={2} textStyle="Heading/Subheading">Current plan</Heading>
        <Text>Team · $12 per member per month · renews on 1 November 2026.</Text>
      </Stack>
      <Stack gap="xs">
        <Heading level={2} textStyle="Heading/Subheading">Payment method</Heading>
        <Text>Visa ending 4242, expires 08/2028.</Text>
      </Stack>
    </Stack>
  );
}

const checks = [
  { id: "dns", label: "DNS records verified", tone: "positive" as const, icon: "icon-check-circle-line" as const },
  { id: "ssl", label: "SSL certificate expires in 5 days", tone: "warning" as const, icon: "icon-alert-triangle-line" as const },
  { id: "deploy", label: "Last deploy failed", tone: "negative" as const, icon: "icon-x-circle-line" as const },
];

function StatusTextExample() {
  const [renewed, setRenewed] = useState(false);
  return (
    <Stack gap="sm" as="ul" aria-label="Site checks">
      {checks.map((check) => {
        const done = check.id === "ssl" && renewed;
        const tone = done ? "positive" : check.tone;
        return (
          <Stack key={check.id} as="li" direction="row" gap="xs" align="center" justify="between">
            <Stack direction="row" gap="xs" align="center">
              <Text as="span" tone={tone}><Icon name={done ? "icon-check-circle-line" : check.icon} size="sm" decorative /></Text>
              <Text as="span" tone={tone}>{done ? "SSL certificate renewed" : check.label}</Text>
            </Stack>
            {check.id === "ssl" && !done ? <Button level="tertiary" size="sm" onClick={() => setRenewed(true)}>Renew now</Button> : null}
          </Stack>
        );
      })}
    </Stack>
  );
}

const files = ["Q4 marketing plan — final review with legal comments v3.pdf", "Brand guidelines 2026.fig", "Customer interviews, round two (transcripts).docx", "Budget.xlsx"];

function TruncateExample() {
  const [open, setOpen] = useState(files[0]);
  return (
    <Grid minColumnWidth={200} gap="sm">
      {files.map((name) => (
        <Card key={name} theme="border" active={open === name} onClick={() => setOpen(name)} aria-label={`Open ${name}`}>
          <Stack gap="xs">
            <FileIcon format={fileIconFormatOf(name)} />
            <Text textStyle="Body/Base/Medium" truncate title={name}>{name}</Text>
            <Text textStyle="Body/Small/Regular" tone="base" truncate={2}>Shared with the design team · last edited by Ava Chen two hours ago</Text>
          </Stack>
        </Card>
      ))}
    </Grid>
  );
}

function PluralExample() {
  const [count, setCount] = useState(1);
  return (
    <Stack gap="md">
      <Text textStyle="Body/Extra/Medium" aria-live="polite">{plural(count, "file")} selected · {plural(count * 3, "page")}</Text>
      <Stack direction="row" gap="sm">
        <Button level="tertiary" size="sm" disabled={count === 0} onClick={() => setCount((value) => Math.max(0, value - 1))}>Deselect a file</Button>
        <Button level="tertiary" size="sm" onClick={() => setCount((value) => value + 1)}>Select a file</Button>
      </Stack>
    </Stack>
  );
}

function MobileTypographyExample() {
  return (
    <ZenProvider typography="mobile" paint={false} portal={false} breakpoint="mobile">
      <PlatformPhone header={<TopNavigation type="default" title="Order #1042" leading={{ icon: "icon-chevron-left-line-medium", label: "Back" }} />}>
        <Stack gap="lg" padding="lg">
          <Stack gap="2xs">
            <Heading level={1}>Arriving Thursday</Heading>
            <Text tone="base">Your order left the warehouse this morning.</Text>
          </Stack>
          <Text textStyle="Body/Small/Regular" tone="light">Typography mode: mobile. The same styles resize for phones.</Text>
        </Stack>
      </PlatformPhone>
    </ZenProvider>
  );
}

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = {
  text: {
    label: "Text & Heading",
    eyebrow: "Components / Text",
    title: "Text & Heading",
    description: "Copy in the Figma text styles and Zen content colours. Heading renders a real h1–h6 whose level follows the page outline; Text covers paragraphs, labels and captions.",
    playground: TextPlayground,
  },
};

export const examples: ExampleMap = {
  text: [
    { title: "Page outline", description: "One h1 per page, h2 for sections; the look comes from textStyle, not from the level.", render: () => <PageOutlineExample />, code: `<Stack gap="lg">
  <Stack gap="2xs">
    <Heading level={1}>Billing</Heading>
    <Text tone="base">Plan, payment method and invoices for Zen Studio.</Text>
  </Stack>
  <Stack gap="xs">
    <Heading level={2} textStyle="Heading/Subheading">Current plan</Heading>
    <Text>Team · $12 per member per month · renews on 1 November 2026.</Text>
  </Stack>
</Stack>` },
    { title: "Status text", description: "Colour families use their Base tone and always pair with an icon or wording, never colour alone.", render: () => <StatusTextExample />, code: `<Stack direction="row" gap="xs" align="center">
  <Text as="span" tone="warning"><Icon name="icon-alert-triangle-line" size="sm" decorative /></Text>
  <Text as="span" tone="warning">SSL certificate expires in 5 days</Text>
</Stack>` },
    { title: "Truncated names in cards", description: "truncate keeps a long name on one line; truncate={2} clamps a description to two lines. The full text stays in the DOM, and the Card's aria-label names the whole file.", render: () => <TruncateExample />, code: `<Card theme="border" active={open === name} onClick={() => setOpen(name)} aria-label={\`Open \${name}\`}>
  <Stack gap="xs">
    <FileIcon format={fileIconFormatOf(name)} />
    <Text textStyle="Body/Base/Medium" truncate title={name}>{name}</Text>
    <Text textStyle="Body/Small/Regular" tone="base" truncate={2}>{description}</Text>
  </Stack>
</Card>` },
    { title: "Counts with plural()", description: "plural(count, “file”) writes “1 file” and “2 files”, never “1 files”.", render: () => <PluralExample />, code: `<Text textStyle="Body/Extra/Medium" aria-live="polite">
  {plural(count, "file")} selected · {plural(count * 3, "page")}
</Text>` },
    { title: "Mobile typography", description: "ZenProvider typography “mobile” resizes every text style for phones; the components don't change.", wide: true, render: () => <MobileTypographyExample />, code: `<ZenProvider typography="mobile">
  <Heading level={1}>Arriving Thursday</Heading>
  <Text tone="base">Your order left the warehouse this morning.</Text>
</ZenProvider>` },
  ],
};
