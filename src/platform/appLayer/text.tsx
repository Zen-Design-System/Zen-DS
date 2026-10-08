import { useState } from "react";
import { Heading, Text, contentToneGroups, type HeadingLevel, type TextTone } from "../../components/Text";
import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, keepOnHotUpdate, option } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";

const styleNames = Object.keys(typographyStyles) as TypographyStyleName[];
/** Every tone once, in token-family order (aliases such as secondary or accent left out). */
const playgroundTones = contentToneGroups.flatMap(({ tones }) => tones);
/** The Heading default per level (the Content hierarchy ladder, as in Text.tsx): the code omits textStyle when it matches. */
const headingDefault: Record<HeadingLevel, TypographyStyleName> = { 1: "Heading/1", 2: "Heading/4", 3: "Heading/Subheading", 4: "Body/Extra/Bold", 5: "Body/Base/Bold", 6: "Body/Base/Bold" };

function TextPlayground() {
  const [heading, setHeading] = useState(false);
  const [level, setLevel] = useState<HeadingLevel>(2);
  const [textStyle, setTextStyle] = useState<TypographyStyleName>("Body/Base/Regular");
  const [tone, setTone] = useState<TextTone>("strongest");
  const [truncate, setTruncate] = useState(false);
  const copy = heading ? "Quarterly planning" : "Plan the quarter with your team: goals, owners and dates in one place, so everyone knows what ships next and why it matters.";
  const styleProp = (heading ? textStyle === headingDefault[level] : textStyle === "Body/Base/Regular") ? "" : ` textStyle="${textStyle}"`;
  const toneProp = tone === "strongest" ? "" : ` tone="${tone}"`;
  return (
    <Panel
      title="Text"
      controls={<>
        <PlaygroundToggle label="Heading" selected={heading} onChange={(on) => { setHeading(on); setTextStyle(on ? headingDefault[level] : "Body/Base/Regular"); }} />
        {heading ? <PlaygroundFilterChip label="Level" value={String(level)} onChange={(value) => { const next = Number(value || 2) as HeadingLevel; setLevel(next); setTextStyle(headingDefault[next]); }} options={["1", "2", "3", "4", "5", "6"].map((id) => option(id, `h${id}`))} /> : null}
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

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = keepOnHotUpdate(import.meta.hot, "pages", {
  text: {
    label: "Text & Heading",
    eyebrow: "Components / Text",
    title: "Text & Heading",
    description: "Copy in the Figma text styles and Zen content colours. Heading renders a real h1–h6 whose level follows the page outline; Text covers paragraphs, labels and captions.",
    playground: TextPlayground,
  },
});

// The examples of these pages live in src/platform/examples/pages/<page>.tsx (examples/registry.ts).
export const examples: ExampleMap = {};
