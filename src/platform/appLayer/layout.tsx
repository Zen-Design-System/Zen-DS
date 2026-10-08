import { useState } from "react";
import { Box, Container, Grid, Stack, type BoxSurface } from "../../components/Layout";
import { ProgressBar } from "../../components/Progress";
import { Text } from "../../components/Text";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, keepOnHotUpdate, option } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";
import "./layout.css";

/* ───────────── Playground ───────────── */

type Kind = "stack" | "grid" | "box" | "container";
const gaps = ["2xs", "xs", "sm", "md", "lg", "xl"] as const;
const aligns = ["start", "center", "end", "stretch"] as const;
const justifies = ["start", "center", "end", "between"] as const;
const trackLists = ["auto", "2", "3", "2fr 1fr", "minmax(0, 240px) 1fr"] as const;
const minWidths = ["120", "160", "200"] as const;
const paddings = ["sm", "md", "lg", "xl"] as const;
const radii = ["md", "lg", "xl", "2xl"] as const;
const surfaces: BoxSurface[] = ["surface", "surface-alt", "subtle", "pale"];
const widths = ["sm", "md", "lg"] as const;

const stackItems = [{ title: "Brief" }, { title: "Moodboard", caption: "12 files" }, { title: "Wireframes" }, { title: "Prototype", caption: "v3 · shared" }];
const gridItems = ["Overview", "Members", "Billing", "Security", "Integrations", "Audit log"];

function Tile({ title, caption }: { title: string; caption?: string }) {
  return (
    <Box surface="surface" border="pale" radius="lg" padding="sm">
      <Stack gap="2xs">
        <Text textStyle="Body/Small/Medium" as="span">{title}</Text>
        {caption ? <Text textStyle="Caption/Regular" tone="light" as="span">{caption}</Text> : null}
      </Stack>
    </Box>
  );
}

const trackCode = (value: number | string) => (typeof value === "number" ? String(value) : `"${value}"`);

function LayoutPlayground() {
  const [kind, setKind] = useState<Kind>("stack");
  const [direction, setDirection] = useState<"row" | "column">("row");
  const [gap, setGap] = useState<(typeof gaps)[number]>("md");
  const [align, setAlign] = useState<(typeof aligns)[number]>("center");
  const [justify, setJustify] = useState<(typeof justifies)[number]>("start");
  const [wrap, setWrap] = useState(true);
  const [tracks, setTracks] = useState<(typeof trackLists)[number]>("auto");
  const [minWidth, setMinWidth] = useState<(typeof minWidths)[number]>("160");
  const [phoneColumn, setPhoneColumn] = useState(true);
  const [surface, setSurface] = useState<BoxSurface>("surface");
  const [bordered, setBordered] = useState(true);
  const [padding, setPadding] = useState<(typeof paddings)[number]>("lg");
  const [radius, setRadius] = useState<(typeof radii)[number]>("xl");
  const [width, setWidth] = useState<(typeof widths)[number]>("sm");
  const [gutter, setGutter] = useState(true);

  const row = direction === "row";
  const fixed = tracks === "auto" ? undefined : /^\d+$/.test(tracks) ? Number(tracks) : tracks;
  const columns = fixed === undefined ? undefined : phoneColumn ? { mobile: 1, desktop: fixed } : fixed;
  const columnsCode = fixed === undefined ? `minColumnWidth={${minWidth}}` : phoneColumn ? `columns={{ mobile: 1, desktop: ${trackCode(fixed)} }}` : typeof fixed === "number" ? `columns={${fixed}}` : `columns="${fixed}"`;

  const preview = kind === "stack" ? (
    <Stack direction={direction} gap={gap} align={align} justify={row ? justify : undefined} wrap={row && wrap} className="pal-stage">
      {stackItems.map((item) => <Tile key={item.title} title={item.title} caption={item.caption} />)}
    </Stack>
  ) : kind === "grid" ? (
    <Grid columns={columns} minColumnWidth={Number(minWidth)} gap={gap} className="pal-stage">
      {gridItems.map((item) => <Tile key={item} title={item} />)}
    </Grid>
  ) : kind === "box" ? (
    <Box surface={surface} border={bordered ? "pale" : "none"} radius={radius} padding={padding} className="pal-box">
      <Stack gap="sm">
        <Stack direction="row" justify="between" align="baseline" gap="sm" wrap>
          <Text textStyle="Body/Base/Bold" as="span">Storage</Text>
          <Text textStyle="Body/Small/Regular" tone="base" as="span">68 GB of 100 GB</Text>
        </Stack>
        <ProgressBar value={68} theme="status" scale="quota" aria-label="Storage used" />
        <Text textStyle="Body/Small/Regular" tone="base">Files, recordings and backups for Zen Studio.</Text>
      </Stack>
    </Box>
  ) : (
    <div className="pal-container-frame">
      <Container maxWidth={width} gutter={gutter}>
        <Box surface="surface" border="pale" radius="lg" padding="lg">
          <Stack gap="2xs">
            <Text textStyle="Body/Base/Bold">Release notes</Text>
            <Text tone="base">Zen 0.4 adds track lists to Grid, so a main column can sit next to a narrower aside, and three Container widths for forms, settings and dashboards.</Text>
          </Stack>
        </Box>
      </Container>
    </div>
  );

  const code = kind === "stack"
    ? `<Stack direction="${direction}" gap="${gap}" align="${align}"${row ? ` justify="${justify}"` : ""}${row && wrap ? " wrap" : ""}>\n  <Box surface="surface" border="pale" radius="lg" padding="sm">Brief</Box>\n  …\n</Stack>`
    : kind === "grid"
      ? `<Grid ${columnsCode} gap="${gap}">\n  <Box surface="surface" border="pale" radius="lg" padding="sm">Overview</Box>\n  …\n</Grid>`
      : kind === "box"
        ? `<Box surface="${surface}"${bordered ? ` border="pale"` : ""} radius="${radius}" padding="${padding}">\n  <Text textStyle="Body/Base/Bold" as="span">Storage</Text>\n  <ProgressBar value={68} theme="status" scale="quota" aria-label="Storage used" />\n</Box>`
        : `<Container maxWidth="${width}"${gutter ? "" : " gutter={false}"}>\n  …page content…\n</Container>`;

  return (
    <Panel
      title="Layout"
      previewClassName="pal-preview"
      controls={<>
        <PlaygroundFilterChip label="Component" value={kind} onChange={(value) => setKind((String(value) || "stack") as Kind)} options={[option("stack", "Stack"), option("grid", "Grid"), option("box", "Box"), option("container", "Container")]} />
        {kind === "stack" ? <PlaygroundFilterChip label="Direction" value={direction} onChange={(value) => setDirection((String(value) || "row") as "row" | "column")} options={[option("row"), option("column")]} /> : null}
        {kind === "stack" || kind === "grid" ? <PlaygroundFilterChip label="Gap" value={gap} onChange={(value) => setGap((String(value) || "md") as (typeof gaps)[number])} options={gaps.map((id) => option(id))} /> : null}
        {kind === "stack" ? <PlaygroundFilterChip label="Align" value={align} onChange={(value) => setAlign((String(value) || "center") as (typeof aligns)[number])} options={aligns.map((id) => option(id))} /> : null}
        {kind === "stack" && row ? <PlaygroundFilterChip label="Justify" value={justify} onChange={(value) => setJustify((String(value) || "start") as (typeof justifies)[number])} options={justifies.map((id) => option(id))} /> : null}
        {kind === "stack" && row ? <PlaygroundToggle label="Wrap" selected={wrap} onChange={setWrap} /> : null}
        {kind === "grid" ? <PlaygroundFilterChip label="Columns" value={tracks} onChange={(value) => setTracks((String(value) || "auto") as (typeof trackLists)[number])} options={trackLists.map((id) => option(id, id === "auto" ? "auto-fill" : id === "minmax(0, 240px) 1fr" ? "240px + 1fr" : id))} /> : null}
        {kind === "grid" && tracks === "auto" ? <PlaygroundFilterChip label="Min column" value={minWidth} onChange={(value) => setMinWidth((String(value) || "160") as (typeof minWidths)[number])} options={minWidths.map((id) => option(id, `${id}px`))} /> : null}
        {kind === "grid" && tracks !== "auto" ? <PlaygroundToggle label="One column on phones" selected={phoneColumn} onChange={setPhoneColumn} /> : null}
        {kind === "box" ? <PlaygroundFilterChip label="Surface" value={surface} onChange={(value) => setSurface((String(value) || "surface") as BoxSurface)} options={surfaces.map((id) => option(id))} /> : null}
        {kind === "box" ? <PlaygroundFilterChip label="Padding" value={padding} onChange={(value) => setPadding((String(value) || "lg") as (typeof paddings)[number])} options={paddings.map((id) => option(id))} /> : null}
        {kind === "box" ? <PlaygroundFilterChip label="Radius" value={radius} onChange={(value) => setRadius((String(value) || "xl") as (typeof radii)[number])} options={radii.map((id) => option(id))} /> : null}
        {kind === "box" ? <PlaygroundToggle label="Pale border" selected={bordered} onChange={setBordered} /> : null}
        {kind === "container" ? <PlaygroundFilterChip label="Max width" value={width} onChange={(value) => setWidth((String(value) || "sm") as (typeof widths)[number])} options={[option("sm", "sm · 640"), option("md", "md · 960"), option("lg", "lg · 1280")]} /> : null}
        {kind === "container" ? <PlaygroundToggle label="Page margin" selected={gutter} onChange={setGutter} /> : null}
      </>}
      code={`import { ${kind === "stack" ? "Box, Stack" : kind === "grid" ? "Box, Grid" : kind === "box" ? "Box, ProgressBar, Text" : "Container"} } from "@zen/design-system";\n\n${code}`}
    >
      {preview}
    </Panel>
  );
}

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = keepOnHotUpdate(import.meta.hot, "pages", {
  layout: {
    label: "Layout",
    eyebrow: "Components / Layout",
    title: "Layout",
    description: "Stack, Grid, Box and Container: page structure with the Figma spacing, padding and radius scales instead of hand-written flex CSS.",
    playground: LayoutPlayground,
  },
});

// The examples of these pages live in src/platform/examples/pages/<page>.tsx (examples/registry.ts).
export const examples: ExampleMap = {};
