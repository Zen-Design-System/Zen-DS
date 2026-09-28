import { useDeferredValue, useEffect, useState } from "react";
import { Icon, iconSizes, type IconSize } from "../components/Icon";
import { Search } from "../components/Search";
import { SelectField } from "../components/Input";
import { EmptyState } from "../components/EmptyState";
import { FileIcon, fileIconData, fileIconFormats } from "../components/FileIcon";
import { getIconData, iconNames } from "../icons/all";

export function IconGallery({ embedded = false }: { embedded?: boolean }) {
  const pageSize = 120;
  const [query, setQuery] = useState("");
  const [size, setSize] = useState<IconSize>("base");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const matches = iconNames.filter((name) => name.includes(deferredQuery));
  const visibleIcons = matches.slice(0, visibleCount);
  // Figma Special Icons → File (icon-media-file): matched by format, label or "file".
  const fileMatches = fileIconFormats.filter((format) => !deferredQuery || `file media ${format} ${fileIconData[format].label}`.toLowerCase().includes(deferredQuery));

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
            <Search
              className="icon-gallery__search-control"
              label="Search icons"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search icon name…"
            />
            {/* Single-value choice: Input/Select-Field opening the shared Popover (Label + options). */}
            <SelectField
              className="icon-gallery__size-control"
              label="Preview size"
              value={size}
              onChange={(event) => setSize(event.target.value as IconSize)}
              options={iconSizes.map((option) => ({ value: option, label: option.toUpperCase() }))}
              popoverLabel="Icon Size"
            />
            <p aria-live="polite">{matches.length.toLocaleString("en-US")} matches</p>
          </section>

          {fileMatches.length ? (
            <section className="icon-gallery__special" aria-labelledby="icon-gallery-file-title">
              <header className="icon-gallery__special-header">
                <h2 id="icon-gallery-file-title">File icons</h2>
                <p>Figma <code>icon-media-file</code> · identifies a file type next to its name (uploads, attachments, file lists). Not an action icon.</p>
              </header>
              <div className="icon-grid">
                {fileMatches.map((format) => (
                  <article className="icon-card" key={format}>
                    <div><FileIcon format={format} size={size} /></div>
                    <strong>{fileIconData[format].label}</strong>
                    <span>{fileIconData[format].tone}</span>
                    <code>{`<FileIcon format="${format}" />`}</code>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {matches.length === 0 && fileMatches.length === 0 ? (
            <EmptyState className="icon-gallery__no-results" title={`No icons match “${query.trim()}”`} icon="icon-search-medium-line" secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>
              Try a shorter name such as “arrow” or “user”, or browse all {iconNames.length.toLocaleString("en-US")} icons.
            </EmptyState>
          ) : null}
          {matches.length && fileMatches.length ? <h2 className="icon-gallery__section-title">System icons</h2> : null}
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
        <EmptyState title="SVG source folder is ready" icon="icon-folder-line">
          Export Figma icons into <code>icons/source/</code>, then run <code>npm run icons:build</code>. The gallery and TypeScript names update automatically.
        </EmptyState>
      )}
    </main>
  );
}
