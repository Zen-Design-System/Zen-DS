import { useDeferredValue, useState } from "react";
import { Search } from "../components/Search";
import { collections } from "./collections";
import { toKebab, tokensForCollection, type ResolvedToken } from "./resolvedTokens";

export type TokenCollectionPageProps = {
  collection: string;
  embedded?: boolean;
};

const aliasPattern = /^\{(.+)\}$/;

const typographyTokens = new Map(
  tokensForCollection("typography-configuration").map((token) => [token.name, token]),
);

const formatValue = (token: ResolvedToken, mode: string, value: string | number | boolean) => {
  if (typeof value !== "number") return String(value);
  if (!token.name.includes("Typography/Letter-Spacing/")) return String(value);

  const suffix = token.name.replace("Typography/Letter-Spacing/", "");
  const fontSizeSuffix = suffix === "Body-Code" ? "Body-Small" : suffix;
  const fontSize = typographyTokens.get(`Typography/Font-Size/${fontSizeSuffix}`)?.valuesByMode[
    mode
  ];
  if (typeof fontSize === "number" && fontSize !== 0) {
    return `${((value / fontSize) * 100).toFixed(2)}%`;
  }
  return `${value.toFixed(2)}px`;
};

function TokenPreview({ token }: { token: ResolvedToken }) {
  const firstValue = token.valuesByMode[token.modes[0]];

  if (token.kind === "color" && token.cssVariable) {
    return (
      <span
        className="token-preview token-preview--color"
        style={{ background: `var(${token.cssVariable})` }}
        aria-label={`Color token ${token.name}`}
      />
    );
  }

  if (token.kind === "dimension" && token.cssVariable) {
    return (
      <span className="token-preview token-preview--dimension" aria-hidden="true">
        <span style={{ width: `min(max(var(${token.cssVariable}), 2px), 96px)` }} />
      </span>
    );
  }

  if (token.kind === "font-family" && token.cssVariable) {
    return (
      <span
        className="token-preview token-preview--type"
        style={{ fontFamily: `var(${token.cssVariable})` }}
      >
        Aa
      </span>
    );
  }

  if (token.kind === "font-style") {
    return (
      <span className={`token-preview token-preview--type zen-type-${toKebab(token.name)}`}>
        Aa
      </span>
    );
  }

  return <span className="token-preview token-preview--value">{String(firstValue)}</span>;
}

function ModeValues({ token }: { token: ResolvedToken }) {
  return (
    <div className="token-mode-values">
      {Object.entries(token.valuesByMode).map(([mode, value]) => {
        const alias = typeof value === "string" ? value.match(aliasPattern)?.[1] : null;
        return (
          <div key={mode}>
            <span>{mode}</span>
            <code title={alias ? String(value) : formatValue(token, mode, value)}>
              {alias ? `↳ ${alias}` : formatValue(token, mode, value)}
            </code>
          </div>
        );
      })}
    </div>
  );
}

export function TokenCollectionPage({ collection: collectionSlug, embedded = false }: TokenCollectionPageProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const collection = collections.find((item) => item.slug === collectionSlug);

  if (!collection) {
    throw new Error(`Unknown Figma collection: ${collectionSlug}`);
  }

  const tokens = tokensForCollection(collection.slug);
  const variableTokens = tokens.filter((token) => token.type !== "TEXT_STYLE");
  const filteredTokens = tokens.filter((token) =>
    token.name.toLowerCase().includes(deferredQuery),
  );
  const visibleTokens = filteredTokens.slice(0, 200);
  const percentage = (variableTokens.length / collection.variableCount) * 100;

  return (
    <main className={`token-page${embedded ? " token-page--embedded" : ""}`}>
      {!embedded ? <header className="token-page__header">
        <div>
          <p className="foundation-eyebrow">Foundations / {collection.layer}</p>
          <h1>{collection.name}</h1>
          <p>{collection.purpose}</p>
        </div>

        <dl className="token-page__stats">
          <div>
            <dt>Figma variables</dt>
            <dd>{collection.variableCount.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt>Imported</dt>
            <dd>{variableTokens.length.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt>Coverage</dt>
            <dd>{percentage.toFixed(1)}%</dd>
          </div>
        </dl>
      </header> : null}

      <section className="token-mode-strip" aria-label="Collection modes">
        <span>Modes</span>
        {collection.modes.map((mode) => (
          <strong key={mode}>{mode}</strong>
        ))}
      </section>

      <div className="token-toolbar">
        <div className="token-toolbar__search">
          <span>Search {collection.name}</span>
          <Search
            size="medium"
            theme="default"
            state="default"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search token path..."
            aria-label={`Search ${collection.name}`}
          />
        </div>
        <p aria-live="polite">
          Showing {visibleTokens.length.toLocaleString("en-US")} of{" "}
          {filteredTokens.length.toLocaleString("en-US")}
        </p>
      </div>

      <section
        className="token-table"
        aria-label={`${collection.name} imported tokens`}
        tabIndex={0}
      >
        <div className="token-table__head" aria-hidden="true">
          <span>Preview</span>
          <span>Figma name</span>
          <span>Values by mode</span>
          <span>CSS variable</span>
        </div>
        {visibleTokens.map((token) => (
          <article className="token-row" key={`${token.type}-${token.name}`}>
            <TokenPreview token={token} />
            <strong>{token.name}</strong>
            <ModeValues token={token} />
            <code>{token.cssVariable ?? `.${`zen-type-${toKebab(token.name)}`}`}</code>
          </article>
        ))}
      </section>

      {filteredTokens.length > visibleTokens.length ? (
        <p className="token-result-note">
          The table renders the first 200 matches for performance. Refine the search to inspect a
          specific token.
        </p>
      ) : null}

      <footer className="token-page__footer">
        <p>Source: alias-preserving Figma Variables JSON export.</p>
        <p>Aliases remain CSS custom-property references and are not flattened.</p>
      </footer>
    </main>
  );
}
