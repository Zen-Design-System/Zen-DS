import { collections } from "./collections";
import { tokensForCollection } from "./resolvedTokens";
import { TokenTableView } from "./TokenTableView";

export type TokenCollectionPageProps = {
  collection: string;
  embedded?: boolean;
};

export function TokenCollectionPage({ collection: collectionSlug, embedded = false }: TokenCollectionPageProps) {
  const collection = collections.find((item) => item.slug === collectionSlug);

  if (!collection) {
    throw new Error(`Unknown Figma collection: ${collectionSlug}`);
  }

  const tokens = tokensForCollection(collection.slug);
  const variableTokens = tokens.filter((token) => token.type !== "TEXT_STYLE");
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

      <TokenTableView key={collection.slug} collectionSlug={collection.slug} collectionName={collection.name} modes={collection.modes} tokens={tokens} />
    </main>
  );
}
