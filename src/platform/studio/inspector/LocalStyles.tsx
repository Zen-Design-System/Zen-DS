import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { plural } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { effectKey } from "../appearance/appearanceModel";
import { InspectorSection } from "./Section";
import "../appearance/appearance.css";

/*
 * Figma's Local styles in the right panel with nothing selected (F5c of
 * docs/research/studio-figma-design-parity-2026-10-18.md): the Zen file's text, color and effect styles, each group
 * folded with its count, each style named with its preview. Read-only: styles are tokens edited in Figma (the style
 * manifest, src/styles/generated/style-manifest.json, read when the panel first opens).
 */

type Manifest = {
  textStyles?: Array<{ name: string }>;
  colors?: Array<{ name: string; token: string }>;
  effectStyles?: Array<{ name: string; token: string }>;
};

let manifest: Promise<Manifest> | null = null;
const loadManifest = () => (manifest ??= import("../../../styles/generated/style-manifest.json").then((module) => module.default as Manifest));

type Group = { id: "text" | "color" | "effect"; title: string; items: Array<{ name: string; preview: ReactNode }> };

function groupsOf(data: Manifest): Group[] {
  const visible = (name: string) => !name.startsWith(".");
  return [
    {
      id: "text",
      title: "Text styles",
      items: (data.textStyles ?? []).filter((style) => visible(style.name)).map((style) => ({
        name: style.name,
        preview: <span className={`studio-local-styles__type ${typographyStyles[style.name as keyof typeof typographyStyles] ?? ""}`} aria-hidden="true">Ag</span>,
      })),
    },
    {
      id: "color",
      title: "Color styles",
      items: (data.colors ?? []).filter((style) => visible(style.name)).map((style) => ({
        name: style.name,
        preview: <span className="studio-local-styles__color" style={{ background: `var(--zen-style-${style.token}-fill)` }} aria-hidden="true" />,
      })),
    },
    {
      id: "effect",
      title: "Effect styles",
      items: (data.effectStyles ?? []).filter((style) => visible(style.name)).map((style) => ({
        name: style.name,
        preview: <span className="studio-effect__swatch" data-effect={effectKey(style.name)} aria-hidden="true" />,
      })),
    },
  ];
}

export function LocalStyles() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [open, setOpen] = useState<Group["id"] | null>(null);
  useEffect(() => {
    let alive = true;
    void loadManifest().then((data) => { if (alive) setGroups(groupsOf(data)); });
    return () => { alive = false; };
  }, []);
  return (
    <InspectorSection title="Local styles" note="Edit styles in Figma">
      {(groups ?? []).filter((group) => group.items.length).map((group) => (
        <div key={group.id} className="studio-local-styles__group">
          {/* zen-allow-compact-button: a disclosure row in a dense tool panel, as Figma's Local styles groups */}
          <Button
            appearance="flat"
            level="primary"
            size="sm"
            className="studio-local-styles__toggle"
            aria-expanded={open === group.id}
            startIcon={<Icon name={open === group.id ? "icon-chevron-down-line" : "icon-chevron-right-line"} size="2xs" decorative />}
            onClick={() => setOpen((current) => (current === group.id ? null : group.id))}
          >
            {`${group.title} · ${plural(group.items.length, "style")}`}
          </Button>
          {open === group.id ? (
            <ul aria-label={group.title} className="studio-local-styles__list">
              {group.items.map((item) => (
                <li key={item.name} className={`studio-local-styles__item ${typographyStyles["Body/Small/Regular"]}`}>
                  {item.preview}
                  <span className="studio-local-styles__name">{item.name}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </InspectorSection>
  );
}
