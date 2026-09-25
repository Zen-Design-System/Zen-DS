import { useDeferredValue, useEffect, useState } from "react";
import { Icon, iconSizes, type IconSize } from "../components/Icon";
import { Search } from "../components/Search";
import { Chip } from "../components/Chip";
import { getIconData, iconNames } from "../icons/generated/iconData";

export function IconGallery({ embedded = false }: { embedded?: boolean }) {
  const pageSize = 120;
  const [query, setQuery] = useState("");
  const [size, setSize] = useState<IconSize>("base");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const matches = iconNames.filter((name) => name.includes(deferredQuery));
  const visibleIcons = matches.slice(0, visibleCount);

  useEffect(() => setVisibleCount(pageSize), [deferredQuery]);

  return (
    <main className={`icon-gallery${embedded ? " icon-gallery--embedded" : ""}`}>
      {!embedded ? <header className="icon-gallery__header">
        <div>
          <p className="foundation-eyebrow">Foundations / iconography</p>
          <h1>Icon Gallery</h1>
          <p>SVG icons are generated from one source folder and rendered through one component.</p>
        </div>
        <dl>
          <div>
            <dt>Icons</dt>
            <dd>{iconNames.length.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt>Monochrome</dt>
            <dd>
              {iconNames.filter((name) => getIconData(name)?.colorMode === "monochrome").length}
            </dd>
          </div>
          <div>
            <dt>Multicolor</dt>
            <dd>{iconNames.filter((name) => getIconData(name)?.colorMode === "multicolor").length}</dd>
          </div>
        </dl>
      </header> : null}

      {iconNames.length ? (
        <>
          <section className="icon-gallery__toolbar" aria-label="Icon filters">
            <div className="icon-gallery__search-control">
              <span>Search icons</span>
              <Search value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search icon name…" aria-label="Search icons" />
            </div>
            <div className="icon-gallery__size-control">
              <span>Preview size</span>
              <Chip
                variant="advanced"
                size="small"
                dropdown
                popoverLabel="Icon Size"
                popoverItems={iconSizes.map((option) => ({ id: option, label: option.toUpperCase(), selected: option === size }))}
                onPopoverSelect={(option) => setSize(option.id as IconSize)}
              >
                {size.toUpperCase()}
              </Chip>
            </div>
            <p aria-live="polite">{matches.length.toLocaleString("en-US")} matches</p>
          </section>

          <section className="icon-grid" aria-label="Available icons">
            {visibleIcons.map((name) => (
              <article className="icon-card" key={name}>
                <div>
                  <Icon name={name} size={size} decorative />
                </div>
                <strong>{name}</strong>
                <span>{getIconData(name)?.colorMode}</span>
                <code>{`<Icon name="${name}" />`}</code>
              </article>
            ))}
          </section>
          {visibleCount < matches.length ? (
            <button
              className="icon-gallery__more"
              type="button"
              onClick={() => setVisibleCount((current) => current + pageSize)}
            >
              Show more icons ({matches.length - visibleCount} remaining)
            </button>
          ) : null}
        </>
      ) : (
        <section className="icon-gallery__empty">
          <span aria-hidden="true">◇</span>
          <div>
            <h2>SVG source folder is ready</h2>
            <p>
              Export Figma icons into <code>icons/source/</code>, then run{" "}
              <code>npm run icons:build</code>. The gallery and TypeScript names update
              automatically.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
