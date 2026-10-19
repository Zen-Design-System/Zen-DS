import { useContext, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { Button } from "../Button";
import { Icon } from "../Icon";
import { Heading, Text } from "../Text";
import "./page-header.css";
import "../Icon/core";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { phoneTrail } from "../_shared/trail-back";
import { useZen } from "../_shared/zen-context";
import { AppShellChromeContext } from "../AppShell/context";

export interface PageHeaderBack {
  /** Where Back goes, named (e.g. "Projects"). */
  label: string;
  onClick: () => void;
}

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** The page title (an h1 by default: one per page). */
  title: ReactNode;
  /**
   * Figma Child-Heading (Primitives/Dashboard/Header Type=Main, 4122:33399): a second title after the title, in the title's
   * type and Content/Neutral/Light, Spacing/Gap/XSmall after it — where the page is inside its parent ("Members" ›
   * "Design team"). Part of the heading, so the page's title reads both.
   */
  childTitle?: ReactNode;
  /** One or two sentences under the title. */
  description?: ReactNode;
  /** Above the title: <Breadcrumbs> for nested pages. */
  breadcrumbs?: ReactNode;
  /** Above the title when there are no breadcrumbs: a short section label. */
  eyebrow?: ReactNode;
  /** Page actions on the right of the title: Tertiary buttons first, then at most one Primary. They wrap under the title on narrow screens; on phones (ZenProvider breakpoint mobile) the Primary is shown first. */
  actions?: ReactNode;
  /** Next to the title: a status Badge, Tag or AvatarStack. */
  meta?: ReactNode;
  /** Figma Trailing-Slots (Primitives/Dashboard/Header Type=Main): icon actions after the page actions, e.g. a More menu or
   *  Share (Button/Icon-Main), Spacing/Gap/Small after them. */
  trailing?: ReactNode;
  /** Under the header: <Tabs> that switch the page's sections. */
  tabs?: ReactNode;
  /** A Back control for detail pages (chevron icon, per the navigation rule). */
  back?: PageHeaderBack;
  /** Heading level of the title. Default 1 (Heading/1, the Figma Master-Layout page title); 2 only when the page already
   *  has an h1 (e.g. inside a tab), set in Heading/4 as the house ladder puts an h2. The text style follows the level. */
  headingLevel?: 1 | 2;
  /** Figma instance overrides: props of the Back button it draws, by layer (`{ Back: { level: "secondary" } }`). Written by Zen Studio;
   *  app code sets back. */
  overrides?: NestedOverrides;
  /** Ref to the root DOM element. */
  ref?: Ref<HTMLElement>;
}

/**
 * The top of an app page: breadcrumbs or eyebrow, the h1 title with its meta and actions, a description and optional
 * section tabs. Spacing and type come from the Figma scales; the header paints nothing (it sits on the page Canvas).
 *
 *   <PageHeader title="Team members" description="12 members · Design workspace"
 *     actions={<><Button level="tertiary">Export</Button><Button level="primary">Invite member</Button></>} />
 */
export function PageHeader({ title, childTitle, description, breadcrumbs, eyebrow, actions, meta, trailing, tabs, back, headingLevel = 1, className, overrides, ref, ...rest }: PageHeaderProps) {
  const nest = useNested(overrides);
  // On a phone the trail gives way (§17; user 2026-10-19: "Trên mobile có thể cân nhắc bỏ Breadcrumb"): Back to the
  // parent crumb on a child page, nothing on a root, nothing beside a `back` of the page's own. A phone is the
  // AppShell's drawer layout under 744, or the provider's mobile breakpoint outside a shell.
  const chrome = useContext(AppShellChromeContext);
  const breakpoint = useZen()?.breakpoint;
  const phone = chrome ? chrome.phone : breakpoint === "mobile";
  const trail = !phone ? breadcrumbs : back ? null : phoneTrail(breadcrumbs);
  return (
    <header {...rest} ref={ref} className={["zen-page-header", className].filter(Boolean).join(" ")}>
      {back ? (
        <div className="zen-page-header__back">
          {nest("Back", <Button appearance="flat" level="primary" size="sm" startIcon={<Icon name="icon-chevron-left-line-medium" decorative />} onClick={back.onClick}>{back.label}</Button>)}
        </div>
      ) : null}
      {trail ? <div className="zen-page-header__breadcrumbs">{nest.slot(trail)}</div> : eyebrow ? <Text className="zen-page-header__eyebrow" textStyle="Body/Small/Medium" tone="base">{eyebrow}</Text> : null}
      <div className="zen-page-header__row">
        <div className="zen-page-header__titles">
          {/* h1 = Heading/1 (Figma ◇ Master-Layout page title), h2 = Heading/4 (the house ladder's h2, backlog batch 6). */}
          <Heading level={headingLevel} textStyle={headingLevel === 1 ? "Heading/1" : "Heading/4"}>
            {title}
            {childTitle ? <span className="zen-page-header__child">{childTitle}</span> : null}
          </Heading>
          {meta ? <div className="zen-page-header__meta">{meta}</div> : null}
        </div>
        {actions || trailing ? (
          <div className="zen-page-header__actions">
            {nest.slot(actions)}
            {trailing ? <span className="zen-page-header__trailing">{nest.slot(trailing)}</span> : null}
          </div>
        ) : null}
      </div>
      {description ? <Text className="zen-page-header__description" tone="base">{description}</Text> : null}
      {tabs ? <div className="zen-page-header__tabs">{tabs}</div> : null}
    </header>
  );
}
