import { textStyleDefinitions } from "../tokens/typography.generated";
import "./text-styles.css";

const groups = [...new Set(textStyleDefinitions.map((style) => style.name.split("/")[0]))];
const letterSpacingUnit = (unit: string) => (unit === "PERCENT" ? "%" : "px");

export function TextStylesGallery({ embedded = false }: { embedded?: boolean }) {
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
              <h2>{group}</h2>
              <span>{styles.length} styles</span>
            </div>
            <div className="text-style-list">
              {styles.map((style) => (
                <article className="text-style-row" key={style.name}>
                  <div className="text-style-row__meta">
                    <strong>{style.name}</strong>
                    <code>.{style.className}</code>
                    <span>
                      {style.fontFamily} · {style.fontWeight} · {style.letterSpacingPercent.toFixed(2)}%
                      <small>
                        ({style.letterSpacing.value.toFixed(2)}
                        {letterSpacingUnit(style.letterSpacing.unit)})
                      </small>
                    </span>
                  </div>
                  <p className={style.className}>The quick brown fox jumps over the lazy dog.</p>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
