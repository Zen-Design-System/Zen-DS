import { useLayoutEffect, useRef, useState } from "react";
import { textStyleDefinitions, typographyStyles } from "../tokens/typography.generated";
import "./text-styles.css";

const groups = [...new Set(textStyleDefinitions.map((style) => style.name.split("/")[0]))];

type TextStyleDefinition = (typeof textStyleDefinitions)[number];
type ResolvedMetrics = { family: string; size: number; lineHeight: string; letterSpacing: number };

/** One style row. The metrics are read from the rendered sample, so they always match the
 * Typography Configuration mode the sample actually renders in. */
function TextStyleRow({ style, sampleTypography }: { style: TextStyleDefinition; sampleTypography?: string }) {
  const sampleRef = useRef<HTMLParagraphElement>(null);
  const [metrics, setMetrics] = useState<ResolvedMetrics | null>(null);
  useLayoutEffect(() => {
    const sample = sampleRef.current;
    if (!sample) return;
    const computed = getComputedStyle(sample);
    const next: ResolvedMetrics = {
      family: computed.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      size: parseFloat(computed.fontSize),
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing === "normal" ? 0 : parseFloat(computed.letterSpacing),
    };
    // Re-read after every render (the surrounding mode can change) but only store real changes.
    setMetrics((current) => (current && current.family === next.family && current.size === next.size && current.lineHeight === next.lineHeight && current.letterSpacing === next.letterSpacing ? current : next));
  });
  const family = metrics?.family ?? style.fontFamily;
  const size = metrics?.size ?? style.fontSize;
  const letterSpacing = metrics?.letterSpacing ?? style.letterSpacing.value;
  const percent = size ? (letterSpacing / size) * 100 : 0;
  return (
    <article className="text-style-row">
      <div className="text-style-row__meta">
        <strong>{style.name}</strong>
        <code>.{style.className}</code>
        <span>
          {family} · {style.fontWeight} · {Math.round(size)}{metrics ? `/${parseFloat(metrics.lineHeight) || metrics.lineHeight}` : ""} · {percent.toFixed(2)}%
          <small>({letterSpacing.toFixed(2)}px)</small>
        </span>
      </div>
      <p ref={sampleRef} className={style.className} data-typography={sampleTypography}>The quick brown fox jumps over the lazy dog.</p>
    </article>
  );
}

/** `sampleTypography` pins the samples to a system Typography Configuration mode
 * (the platform passes Dashboard so its own Zen-Platform UI never leaks into the samples). */
export function TextStylesGallery({ embedded = false, sampleTypography }: { embedded?: boolean; sampleTypography?: string }) {
  return (
    <main className={`text-styles-page${embedded ? " text-styles-page--embedded" : ""}`}>
      {!embedded ? <header className="text-styles-page__header">
        <div>
          <p className="foundation-eyebrow">Foundations / styles</p>
          <h1>Text Styles</h1>
          <p>
            Composite typography contracts exported from Figma and connected to Typography and
            Emphasis variables.
          </p>
        </div>
        <dl>
          <div>
            <dt>Styles</dt>
            <dd>{textStyleDefinitions.length}</dd>
          </div>
          <div>
            <dt>Families</dt>
            <dd>{groups.length}</dd>
          </div>
        </dl>
      </header> : null}

      {groups.map((group) => {
        const styles = textStyleDefinitions.filter((style) => style.name.split("/")[0] === group);
        return (
          <section className="text-style-group" key={group}>
            <div className="text-style-group__heading">
              <h2 className={typographyStyles["Heading/3"]}>{group}</h2>
              <span>{styles.length} styles</span>
            </div>
            <div className="text-style-list">
              {styles.map((style) => <TextStyleRow key={style.name} style={style} sampleTypography={sampleTypography} />)}
            </div>
          </section>
        );
      })}
    </main>
  );
}
