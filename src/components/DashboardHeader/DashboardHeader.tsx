import { type HTMLAttributes, type ReactNode, type Ref } from "react";
import { PageHeader } from "../PageHeader";
import { Text } from "../Text";
import { useNested, type NestedOverrides } from "../_shared/nested";
import "./dashboard-header.css";

/** Figma Type of Primitives/Dashboard/Header (4122:33402): the four rows a dashboard page header is built from. */
export const dashboardHeaderTypes = ["navigation", "main", "control-bar", "custom"] as const;
export type DashboardHeaderType = (typeof dashboardHeaderTypes)[number];

export interface DashboardHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /**
   * Figma Type. `control-bar` (Figma's default): Search, filter Chips, a result count and the actions. `navigation`:
   * Breadcrumbs on the left, notifications and the account on the right. `main`: the page title row — it renders a
   * PageHeader (use PageHeader directly when you also need breadcrumbs, tabs or Back). `custom`: your own row.
   */
  type?: DashboardHeaderType;
  /** Navigation · Figma Leading-Slots: usually <Breadcrumbs>. It fills the row's start. */
  leading?: ReactNode;
  /** Navigation · Figma Center-Slots (Nav-Center-Block): up to 400px in the middle of the row, e.g. a Search. */
  center?: ReactNode;
  /**
   * Navigation and Main · Figma Trailing-Slots (Nav-Trailing-Block): icon actions then the account, right-aligned,
   * Spacing/Gap/Small apart — <AppShellAction> buttons (notifications with a dot or count) and an Avatar or account menu.
   */
  trailing?: ReactNode;
  /** Control-Bar · Figma Search: a <Search size="md"> that filters the page, 320px wide. */
  search?: ReactNode;
  /** Control-Bar · Figma Control-Slots: filter Chips (`<Chip variant="advanced">`), Spacing/Gap/XSmall apart. */
  controls?: ReactNode;
  /**
   * Figma Subheading. Control-Bar: what the filters leave, e.g. "96 results" (Heading/Subheading). Main: one line under
   * the title (the PageHeader description).
   */
  subheading?: ReactNode;
  /**
   * Control-Bar and Main · Figma Action-Slots: the page's buttons, right-aligned — Tertiary first, then at most one
   * Primary.
   */
  actions?: ReactNode;
  /** Main · Figma Header-Text: the page title (Heading/1, an h1 unless `headingLevel` is 2). */
  title?: ReactNode;
  /** Main · Figma Child-Heading: a second title after the title, in Content/Neutral/Light (PageHeader `childTitle`). */
  childTitle?: ReactNode;
  /** Main · heading level of the title (PageHeader `headingLevel`). Default 1. */
  headingLevel?: 1 | 2;
  /** Custom · Figma Custome-Elements: the row's content, Spacing/Gap/Medium apart and centred. */
  children?: ReactNode;
  /** Figma instance overrides of the components in its slots, by layer. Written by Zen Studio; app code sets the slots. */
  overrides?: NestedOverrides;
  /** Ref to the root DOM element. */
  ref?: Ref<HTMLElement>;
}

/**
 * One row of a dashboard page's header (Figma ◇ Master-Layout, Primitives/Dashboard/Header 4122:33402): a 40px row
 * (Button/Size/Medium) in one of Figma's four types. It paints nothing and adds no padding: inside an AppShell, put the
 * rows in `sections` (Figma Header/Dashboard, which pads each row); the app frame's own top bar is AppShell's `header`.
 * Spacing from the Figma scales: Gap/Medium between the row's groups, Gap/Small inside the action groups, Gap/XSmall
 * between filter Chips.
 *
 *   <DashboardHeader search={<Search size="md" placeholder="Search leaves" />} controls={<Chip variant="advanced">Status</Chip>}
 *     actions={<><Button level="tertiary">Export</Button><Button level="primary">Submit leave</Button></>} />
 */
export function DashboardHeader({ type = "control-bar", leading, center, trailing, search, controls, subheading, actions, title, childTitle, headingLevel = 1, children, className, overrides, ref, ...rest }: DashboardHeaderProps) {
  const nest = useNested(overrides);
  const classes = ["zen-dashboard-header", className].filter(Boolean).join(" ");
  if (type === "main") {
    // Figma Type=Main is PageHeader's row: Header-Text (title, Child-Heading, Subheading), Action-Slots, Trailing-Slots.
    // zen-allow-overrides: the library passes Zen Studio's overrides on to the PageHeader it renders.
    return <PageHeader {...rest} ref={ref} className={classes} data-type="main" title={title ?? ""} childTitle={childTitle} description={subheading} actions={actions} trailing={trailing} headingLevel={headingLevel} overrides={overrides} />;
  }
  return (
    <div {...rest} ref={ref as never} className={classes} data-type={type} data-center={type === "navigation" && center ? "true" : undefined}>
      {type === "navigation" ? (
        <>
          <div className="zen-dashboard-header__leading">{nest.slot(leading)}</div>
          {center ? <div className="zen-dashboard-header__center">{nest.slot(center)}</div> : null}
          {trailing ? <div className="zen-dashboard-header__trailing">{nest.slot(trailing)}</div> : null}
        </>
      ) : type === "control-bar" ? (
        <>
          {search ? <div className="zen-dashboard-header__search">{nest.slot(search)}</div> : null}
          {controls ? <div className="zen-dashboard-header__controls">{nest.slot(controls)}</div> : null}
          {/* zen-allow-visual-heading: Figma's Subheading here is the result count ("96 results"), a value, not a title. */}
          {subheading ? <Text as="span" className="zen-dashboard-header__subheading" textStyle="Heading/Subheading">{subheading}</Text> : null}
          {actions ? <div className="zen-dashboard-header__actions">{nest.slot(actions)}</div> : null}
        </>
      ) : (
        nest.slot(children)
      )}
    </div>
  );
}
