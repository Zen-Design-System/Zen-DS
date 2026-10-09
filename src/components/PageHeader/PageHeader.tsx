import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { Button } from "../Button";
import { Icon } from "../Icon";
import { Heading, Text } from "../Text";
import "./page-header.css";
import "../Icon/core";

export interface PageHeaderBack {
  /** Where Back goes, named (e.g. "Projects"). */
  label: string;
  onClick: () => void;
}

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** The page title (an h1 by default: one per page). */
  title: ReactNode;
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
}

/**
 * The top of an app page: breadcrumbs or eyebrow, the h1 title with its meta and actions, a description and optional
 * section tabs. Spacing and type come from the Figma scales; the header paints nothing (it sits on the page Canvas).
 *
 *   <PageHeader title="Team members" description="12 members · Design workspace"
 *     actions={<><Button level="tertiary">Export</Button><Button level="primary">Invite member</Button></>} />
 */
export const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(function PageHeader(
  { title, description, breadcrumbs, eyebrow, actions, meta, trailing, tabs, back, headingLevel = 1, className, ...rest },
  ref,
) {
  return (
    <header {...rest} ref={ref} className={["zen-page-header", className].filter(Boolean).join(" ")}>
      {back ? (
        <div className="zen-page-header__back">
          <Button appearance="flat" level="primary" size="sm" startIcon={<Icon name="icon-chevron-left-line-medium" decorative />} onClick={back.onClick}>{back.label}</Button>
        </div>
      ) : null}
      {breadcrumbs ? <div className="zen-page-header__breadcrumbs">{breadcrumbs}</div> : eyebrow ? <Text className="zen-page-header__eyebrow" textStyle="Body/Small/Medium" tone="base">{eyebrow}</Text> : null}
      <div className="zen-page-header__row">
        <div className="zen-page-header__titles">
          {/* h1 = Heading/1 (Figma ◇ Master-Layout page title), h2 = Heading/4 (the house ladder's h2, backlog batch 6). */}
          <Heading level={headingLevel} textStyle={headingLevel === 1 ? "Heading/1" : "Heading/4"}>{title}</Heading>
          {meta ? <div className="zen-page-header__meta">{meta}</div> : null}
        </div>
        {actions || trailing ? (
          <div className="zen-page-header__actions">
            {actions}
            {trailing ? <span className="zen-page-header__trailing">{trailing}</span> : null}
          </div>
        ) : null}
      </div>
      {description ? <Text className="zen-page-header__description" tone="base">{description}</Text> : null}
      {tabs ? <div className="zen-page-header__tabs">{tabs}</div> : null}
    </header>
  );
});
