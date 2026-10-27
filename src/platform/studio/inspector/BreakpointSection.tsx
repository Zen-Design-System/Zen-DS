import { useMemo } from "react";
import { Icon } from "../../../components/Icon";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { IconName } from "../../../icons/generated/names";
import { BREAKPOINT_ICONS, BREAKPOINT_LABELS, screenBreakpoint, viewDevice } from "../../../../tools/studio/screen-devices.mjs";
import { screenLayout } from "../../../../tools/studio/screen-chrome.mjs";
import { DEVICE_WIDTH, type PageDevice } from "../builder/proto/runtime";
import type { PageNode, PageTree } from "../builder/render/renderPage";
import { useScreenView } from "../builder/screenViews";
import { behavioursAt, screenFacts } from "./breakpointBehaviours";
import { InspectorSection, SectionNote } from "./Section";

/*
 * The Screen's breakpoint in the Inspector (docs/research/studio-responsive-breakpoints-2026-10-26.md §3.5, §5): what Zen
 * changes by itself at the breakpoint the Screen shows (its view's, else its own; inspector/breakpointBehaviours.ts), and
 * for a separate Screen, whose version it is.
 */

const literal = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };

export function BreakpointSection({ frameId, node, tree }: { frameId: string; node: PageNode; tree: PageTree | null }) {
  const view = useScreenView(frameId);
  const device = (literal(node, "device") as PageDevice | undefined) ?? "desktop";
  const width = (literal(node, "width") as number | undefined) ?? DEVICE_WIDTH[device];
  const height = literal(node, "height") as number | undefined;
  const viewed = viewDevice(view, height);
  const shown = viewed
    ? { device: viewed.device, width: viewed.width, layout: screenLayout(viewed.device, viewed.layout) as "mobile" | "desktop" }
    : { device, width, layout: screenLayout(device, literal(node, "layout") as string | undefined) as "mobile" | "desktop" };
  const breakpoint = screenBreakpoint(shown.device, shown.width);
  const changes = useMemo(() => behavioursAt(screenFacts(node, { ...shown, breakpoint })), [node, shown.device, shown.width, shown.layout, breakpoint]); // eslint-disable-line react-hooks/exhaustive-deps -- `shown` by its fields
  // A separate Screen (Make a separate Screen): the primary it was copied from.
  const versionOf = literal(node, "versionOf");
  const primary = typeof versionOf === "string" ? tree?.board?.children.find((child): child is PageNode => child.kind === "element" && child.name === "Screen" && literal(child, "id") === versionOf) : undefined;
  const primaryTitle = primary ? String(literal(primary, "title") ?? versionOf) : typeof versionOf === "string" ? versionOf : null;
  const name = BREAKPOINT_LABELS[breakpoint];
  return (
    <InspectorSection
      title={`Changes on ${name}`}
      className="studio-breakpoint-section"
      actions={<Icon name={BREAKPOINT_ICONS[breakpoint] as IconName} size="sm" decorative />}
      note={primaryTitle ? <SectionNote text={`A ${BREAKPOINT_LABELS[screenBreakpoint(device, width)]} copy of ${primaryTitle}: edits stay here`} more="A copy of that Screen, so edits here stay here. Parts made into components (⌥⌘K) stay shared." /> : undefined}
    >
      {changes.length ? (
        <ul className="studio-breakpoint-section__list" aria-label={`What Zen changes on ${name}`}>
          {changes.map((change) => (
            <li key={change.id} className={typographyStyles["Body/Small/Regular"]} title={change.detail} data-behaviour={change.id}>{change.label}</li>
          ))}
        </ul>
      ) : (
        <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>{breakpoint === "desktop" ? <SectionNote text="Nothing: Desktop is the Screen as designed" more="View it on Tablet or Mobile to see what changes." /> : `Nothing on this Screen changes on ${name}.`}</p>
      )}
    </InspectorSection>
  );
}
