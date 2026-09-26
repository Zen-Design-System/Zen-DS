import { collections, totals } from "./collections";
import { typographyStyles } from "../tokens/typography.generated";

const layerLabels = {
  primitive: "Primitive",
  semantic: "Semantic",
  component: "Component",
  layout: "Layout",
};

export function FoundationOverview({ embedded = false }: { embedded?: boolean }) {
  return (
    <main className={`foundation-shell${embedded ? " foundation-shell--embedded" : ""}`}>
      {!embedded ? <header className="foundation-hero">
        <p className="foundation-eyebrow">Zen Design System</p>
        <h1>Figma variable foundation</h1>
        <p className="foundation-lede">
          The source contract for primitives, semantic tokens, component themes,
          typography, spacing and responsive foundations.
        </p>
        <dl className="foundation-stats">
          <div>
            <dt>Collections</dt>
            <dd>{totals.collections}</dd>
          </div>
          <div>
            <dt>Variables</dt>
            <dd>{totals.variables.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt>Internal variables (audit)</dt>
            <dd>{totals.hiddenVariables.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt>Imported variables</dt>
            <dd>
              {totals.resolvedVariables}/{totals.variables.toLocaleString("en-US")}
            </dd>
          </div>
        </dl>
        <p className="foundation-sync-note">
          All exported variables are imported with their modes and alias references intact.
        </p>
      </header> : null}

      <section aria-labelledby="collections-heading">
        <div className="section-heading">
          <div>
            <p className="foundation-eyebrow">Source inventory</p>
            <h2 id="collections-heading">Variable collections</h2>
          </div>
          <p className={typographyStyles["Heading/3"]}>Modes stay as independent axes; they are never flattened into one mega-theme.</p>
        </div>

        <div className="collection-grid">
          {collections.map((collection, index) => (
            <article className="collection-card" key={collection.slug}>
              <div className="collection-card__topline">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span className={`layer-badge layer-badge--${collection.layer}`}>
                  {layerLabels[collection.layer]}
                </span>
              </div>
              <h3>{collection.name}</h3>
              <p>{collection.purpose}</p>
              <dl className="collection-card__meta">
                <div>
                  <dt>Variables</dt>
                  <dd>{collection.variableCount.toLocaleString("en-US")}</dd>
                </div>
                <div>
                  <dt>Modes</dt>
                  <dd>{collection.modes.length}</dd>
                </div>
              </dl>
              <div className="mode-list" aria-label={`${collection.name} modes`}>
                {collection.modes.map((mode) => (
                  <span key={mode}>{mode}</span>
                ))}
              </div>
              {/* Always rendered so every card has the same rows; hidden when there is no mode axis. */}
              <code className="code-axis" data-empty={collection.codeAxis ? undefined : "true"} aria-hidden={collection.codeAxis ? undefined : true}>{collection.codeAxis ?? "—"}</code>
            </article>
          ))}
        </div>
      </section>

      <section className="foundation-flow" aria-labelledby="flow-heading">
        <p className="foundation-eyebrow">Dependency rule</p>
        <h2 id="flow-heading">One-way token flow</h2>
        <ol>
          <li>Primitive</li>
          <li>Semantic</li>
          <li>Component</li>
          <li>React component</li>
        </ol>
      </section>
    </main>
  );
}
