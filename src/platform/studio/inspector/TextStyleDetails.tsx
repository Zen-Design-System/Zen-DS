import { typographyStyles, textStyleDefinitions } from "../../../tokens/typography.generated";
import { InputField } from "../../../components/Input";
import { InspectorFields } from "./Section";

/*
 * Figma's style details for a text layer with a text style (F5c of docs/research/studio-figma-design-parity-2026-10-18.md):
 * the style's font, size, line height, letter spacing, paragraph spacing, case and decoration, read-only (a text style is a
 * token, edited in Figma, as effect styles are). Size and line height are read where the text renders, so they follow
 * the density and typography modes; the rest comes from the style (tokens/typography.generated.ts).
 */

const CASES: Readonly<Record<string, string>> = { ORIGINAL: "As typed", UPPER: "Uppercase", LOWER: "Lowercase", TITLE: "Title case" };
const definitions = new Map<string, (typeof textStyleDefinitions)[number]>(textStyleDefinitions.map((definition) => [definition.name, definition]));
const signed = (value: number) => (value < 0 ? `−${Math.abs(value)}` : String(value));

/** The text style named `style` ("Body/Small/Medium"), or null when it is not one of Zen's. */
export function textStyleDefinition(style: string | null | undefined) {
  return style ? definitions.get(style) ?? null : null;
}

function Value({ label, value }: { label: string; value: string }) {
  return <InputField size="sm" aria-label={label} value={value} readOnly />;
}

export function TextStyleDetails({ id, style, host }: { id: string; style: string; host: Element | null }) {
  const definition = textStyleDefinition(style);
  if (!definition) return null;
  const computed = host?.isConnected ? getComputedStyle(host) : null;
  const size = computed ? Math.round(parseFloat(computed.fontSize) * 10) / 10 : definition.fontSize;
  const lineHeight = computed && computed.lineHeight !== "normal" ? String(Math.round(parseFloat(computed.lineHeight) * 10) / 10) : "Auto";
  const paragraph = "paragraphSpacing" in definition && typeof definition.paragraphSpacing === "number" ? definition.paragraphSpacing : 0;
  return (
    <div id={id} className="studio-text-details" role="group" aria-label={`${style} details`}>
      <InspectorFields labels={["Font"]} fields={[<Value key="font" label="Font" value={`${definition.fontFamily} ${definition.fontWeight}`} />]} />
      <InspectorFields labels={["Size", "Line height"]} fields={[<Value key="size" label="Size" value={String(size)} />, <Value key="line" label="Line height" value={lineHeight} />]} />
      <InspectorFields labels={["Letter spacing", "Paragraph spacing"]} fields={[<Value key="letter" label="Letter spacing" value={`${signed(definition.letterSpacingPercent)}%`} />, <Value key="paragraph" label="Paragraph spacing" value={String(paragraph)} />]} />
      <InspectorFields labels={["Case", "Decoration"]} fields={[<Value key="case" label="Case" value={CASES[definition.textCase] ?? definition.textCase} />, <Value key="decoration" label="Decoration" value="None" />]} />
      <p className={`studio-text-details__note ${typographyStyles["Caption/Regular"]}`}>Edit text styles in Figma</p>
    </div>
  );
}
