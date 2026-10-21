import { useCallback, useContext, useState, type ButtonHTMLAttributes, type FocusEvent, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { Avatar, type AvatarTheme } from "../Avatar";
import { IconButton } from "../Button";
import { DashboardHeader } from "../DashboardHeader";
import { Icon, type IconName } from "../Icon";
import { useIconTooltip } from "../Tooltip";
import { NotificationDot } from "../_shared/notification-dot";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useIsomorphicLayoutEffect } from "../_shared/use-isomorphic-layout-effect";
import { useMergedRefs } from "../_shared/merge-refs";
import { phoneTrail } from "../_shared/trail-back";
import { useZenLabels } from "../_shared/zen-context";
import { AppShellChromeContext } from "./context";
import "../Icon/core";

/** Figma Header/AppShell Theme (16783:71068). */
export const appShellHeaderThemes = ["default", "border-divider"] as const;
export type AppShellHeaderTheme = (typeof appShellHeaderThemes)[number];
/** Figma Header/AppShell Density. */
export const appShellHeaderDensities = ["medium", "small"] as const;
export type AppShellHeaderDensity = (typeof appShellHeaderDensities)[number];

export interface AppShellHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Figma Top-Elements › Leading-Slots: where the user is, usually `<Breadcrumbs size="sm">`, or a Search. It grows. */
  leading?: ReactNode;
  /** Figma Center-Slots: the row's middle, up to 400px and centred between `leading` and `actions`, e.g. a Search. */
  center?: ReactNode;
  /**
   * Figma Trailing-Slots, Spacing/Gap/Small apart: a plan Badge, `AppShellAction` buttons (notifications, help), then
   * the account (`<Menu trigger={<AppShellAccount … />}>`). Page actions belong in `main`.
   */
  actions?: ReactNode;
  /** Figma Main-Element (the Main row): the page's own header, usually `<PageHeader title=… />` with its actions. */
  main?: ReactNode;
  /** Figma Sections: rows under the Main row, e.g. `<Tabs>` for the page's views or a toolbar of Search + filters. */
  sections?: ReactNode;
  /**
   * Figma Theme: `default` (one Main frame: Margin-Comfortable above and at the sides, Padding/Small below,
   * Spacing/Gap/Large between the rows) · `border-divider` (Theme=Border & Divider, 16783:72140: the top row pads
   * Padding/Small · Margin-Comfortable with a 1px Border/Neutral/Pale line under it; the Main row pads Padding/Large
   * above, Padding/Medium below, Margin-Comfortable at the sides). Unset follows the AppShell: `pattern="grid"` draws border-divider, other patterns default.
   */
  theme?: AppShellHeaderTheme;
  /** Figma Density: `medium` (Margin-Comfortable above) · `small` (Margin-Compact above, 16823:76454). Unset follows
   *  the AppShell: `pattern="grid"` draws small, other patterns medium. The border-divider theme pads its rows itself. */
  density?: AppShellHeaderDensity;
  /** Figma instance overrides, by layer (`{ Collapse: { level: "secondary" } }`). Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** The root `<header>` element. */
  ref?: Ref<HTMLElement>;
}

/**
 * Whether the top row's `leading` content does not fit on one line beside the toggle and the actions. It is measured at
 * its own one-line width, so the answer does not depend on the current layout; then it takes a row of its own.
 */
function useStackedRow(row: HTMLElement | null, content: HTMLElement | null, toggle: HTMLElement | null, actions: HTMLElement | null): boolean {
  const [stacked, setStacked] = useState(false);
  const measure = useCallback(() => {
    if (!row || !content) { setStacked(false); return; }
    // The row's own padding is not room (theme="border-divider" pads the top row Margin-Comfortable on both sides).
    const rowStyle = getComputedStyle(row);
    const room = row.clientWidth - (parseFloat(rowStyle.paddingLeft) || 0) - (parseFloat(rowStyle.paddingRight) || 0);
    if (room <= 0) return;
    const leading = content.parentElement;
    const leadingGap = leading ? parseFloat(getComputedStyle(leading).columnGap) || 0 : 0;
    const rowGap = parseFloat(rowStyle.columnGap) || 0;
    // Rendered widths ÷ the scale the row is drawn at (a CSS transform around the shell): CSS px, as `room` is.
    const scale = row.offsetWidth > 0 ? row.getBoundingClientRect().width / row.offsetWidth || 1 : 1;
    const toggleWidth = (toggle?.getBoundingClientRect().width ?? 0) / scale;
    const actionsWidth = (actions?.getBoundingClientRect().width ?? 0) / scale;
    const { flex, width } = content.style;
    content.style.flex = "none"; content.style.width = "max-content";
    const natural = content.getBoundingClientRect().width / scale;
    content.style.flex = flex; content.style.width = width;
    const needed = natural + (toggleWidth ? toggleWidth + rowGap : 0) + (actionsWidth ? actionsWidth + leadingGap : 0);
    // Fits only with a pixel to spare: a trail that fills the row exactly wraps anyway once its sub-pixel width rounds
    // (layout page, 390: 158 + 20 + 16 + 92 + 16 = 302 in a 302 row broke "Settings › Workspace" onto two lines).
    setStacked(needed > room - 1);
  }, [row, content, toggle, actions]);
  useIsomorphicLayoutEffect(measure);
  useIsomorphicLayoutEffect(() => {
    if (!row || typeof ResizeObserver === "undefined") return undefined;
    // The row keeps its width when a density switch grows the trail or the actions: watch them too.
    const observer = new ResizeObserver(() => measure());
    for (const element of [row, content, actions]) if (element) observer.observe(element);
    return () => observer.disconnect();
  }, [row, content, actions, measure]);
  return stacked;
}

/**
 * Figma Header/AppShell (16783:71068; Theme=Default 16243:290461), the header of Pattern/AppShell/Desktop. The Main frame
 * pads Margin-Comfortable above (Margin-Compact at Density=Small) and at the sides and Spacing/Padding/Small below,
 * Spacing/Gap/Large between its rows (`theme="border-divider"` pads each row itself, a Pale line under the top row):
 * - Top-Header: the Sidebar's collapse toggle (Collapse Button: a Button/Icon-Flat Small Primary in a 20px wrapper, while
 *   the AppShell has `collapse="header"`) or, on a narrow shell, the menu button that opens the navigation drawer; then
 *   Top-Elements: `leading` · `center` · `actions` (Primitives/Dashboard/Header Type=Navigation), Spacing/Gap/Medium apart.
 * - Main-Element: `main`, the page's own header.
 * Under the Main frame, Sections: `sections`. Pass it as the AppShell's `header`; on a phone the shell shows its
 * `topNavigation` instead.
 */
export function AppShellHeader({ leading, center, actions, main, sections, theme: themeProp, density: densityProp, className, overrides, ref, ...rest }: AppShellHeaderProps) {
  const t = useZenLabels();
  const nest = useNested(overrides);
  const chrome = useContext(AppShellChromeContext);
  const theme = themeProp ?? chrome?.headerTheme ?? "default";
  const density = densityProp ?? chrome?.headerDensity ?? "medium";
  // On a phone the top row's trail gives way: Back to the parent crumb on a child page, nothing on a root (§17).
  const shownLeading = chrome?.phone ? phoneTrail(leading) : leading;
  const [rowEl, setRowEl] = useState<HTMLDivElement | null>(null);
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);
  const [toggleEl, setToggleEl] = useState<HTMLSpanElement | null>(null);
  const [actionsEl, setActionsEl] = useState<HTMLDivElement | null>(null);
  const [headerEl, setHeaderEl] = useState<HTMLElement | null>(null);
  const headerRef = useMergedRefs(ref, setHeaderEl);
  // The shell measures its header (the panes and the Sidebar stick under it).
  useIsomorphicLayoutEffect(() => chrome?.registerHeader(headerEl), [chrome, headerEl]);
  const stacked = useStackedRow(rowEl, shownLeading ? contentEl : null, toggleEl, actions ? actionsEl : null);
  const toggleKind = chrome?.toggle ?? null;
  const toggle = toggleKind ? (
    <span ref={setToggleEl} className="zen-app-shell-header__toggle">
      {toggleKind === "menu" ? (
        // zen-allow-filter-button: this button opens the navigation drawer (a dialog), not a choice list.
        nest("Menu", <IconButton appearance="flat" level="primary" size="sm" icon={<Icon name="icon-menu-01-line" />} aria-label={t.openNavigation} aria-haspopup="dialog" aria-expanded={chrome?.navOpen} onClick={chrome?.openNav} />)
      ) : (
        nest("Collapse", <IconButton appearance="flat" level="primary" size="sm" icon={<Icon name={chrome?.sidebarCollapsed ? "icon-layout-right-line" : "icon-layout-left-line"} />} aria-label={chrome?.sidebarCollapsed ? t.expandSidebar : t.collapseSidebar} aria-expanded={!chrome?.sidebarCollapsed} aria-controls={chrome?.sidebarId} onClick={chrome?.toggleSidebar} />)
      )}
    </span>
  ) : null;
  const hasTop = Boolean(toggle || shownLeading || center || actions);
  return (
    <header {...rest} ref={headerRef} className={["zen-app-shell-header", className].filter(Boolean).join(" ")} data-stacked={stacked || undefined}
      data-stack-center={chrome?.phone && center ? "true" : undefined} data-phone={chrome?.phone || undefined}
      data-theme={theme === "default" ? undefined : theme} data-density={density === "medium" ? undefined : density}>
      {hasTop || main ? (
        <div className="zen-app-shell-header__main">
          {hasTop ? (
            <div ref={setRowEl} className="zen-app-shell-header__top">
              {toggle}
              {/* Top-Elements = Primitives/Dashboard/Header Type=Navigation: Leading-Slots · Center-Slots · Trailing-Slots. */}
              <DashboardHeader
                type="navigation"
                className="zen-app-shell-header__bar"
                leading={shownLeading ? <div ref={setContentEl} className="zen-app-shell-header__leading">{nest.slot(shownLeading)}</div> : undefined}
                center={center ? nest.slot(center) : undefined}
                trailing={actions ? <div ref={setActionsEl} className="zen-app-shell-header__actions">{nest.slot(actions)}</div> : undefined}
              />
            </div>
          ) : null}
          {main ? <div className="zen-app-shell-header__element">{nest.slot(main)}</div> : null}
        </div>
      ) : null}
      {sections ? <div className="zen-app-shell-header__sections">{nest.slot(sections)}</div> : null}
    </header>
  );
}

/* ───────────── Header parts ───────────── */

export type AppShellActionTone = "default" | "active" | "accent";

export interface AppShellActionProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Figma Leading-Icon: an icon name (`"icon-bell-01-line"`) or a node. */
  icon: IconName | ReactNode;
  /** The action's name (“Notifications”): its accessible name, with the unread count added, and its 1s tooltip. */
  "aria-label": string;
  /** Figma Noti-type=Number: the unread count on a badge. 0 hides it; above 99 it reads "99+" (the accessible name keeps the exact number). */
  count?: number;
  /** Figma Noti-type=Dot: something new without a count. Hidden while a count shows. */
  dot?: boolean;
  /** Figma Notification-Dot Theme: `default` Negative (needs attention) · `active` Positive · `accent`. */
  tone?: AppShellActionTone;
  /** Figma Theme: `tertiary` (Button/Icon-Main Medium Tertiary, 40px) · `flat` (Button/Icon-Flat Medium Primary: a 20px glyph with a 40px hit area). */
  appearance?: "tertiary" | "flat";
  /** Tooltip text. Default: `aria-label` (without the count). */
  tooltip?: ReactNode | false;
  /** Figma instance overrides: props of the icon button it draws, by layer (`{ Button: { level: "secondary" } }`). Written by Zen Studio;
   *  app code sets icon / appearance. */
  overrides?: NestedOverrides;
  /** Ref to the icon button element, so the action can be a `<Menu trigger>`. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Figma Primitives/Dashboard/Header/Action-Item (12280:19532): a header icon action with an optional
 * Primitives/Notification-Dot (4116:21789). Dot 8px, Number Badge/Size/2XSmall high with Label/Small/Medium text, both on
 * Color/Background/{Negative|Positive|Accent}/Solid with a 2px Color/Border/Inverse ring, at the button's top-right.
 * It forwards its ref and props to the button, so it can be a <Menu trigger>.
 */
export function AppShellAction({ icon, count, dot = false, tone = "default", appearance = "tertiary", tooltip, className, "aria-label": label, overrides, ref, ...buttonProps }: AppShellActionProps) {
  const t = useZenLabels();
  const nest = useNested(overrides);
  const unread = typeof count === "number" && count > 0 ? Math.floor(count) : 0;
  const name = unread ? t.withUnread(label, unread) : dot ? t.withUnread(label) : label;
  return (
    <span className={["zen-app-shell-action", className].filter(Boolean).join(" ")} data-appearance={appearance}>
      {nest("Button", <IconButton {...buttonProps} ref={ref} appearance={appearance === "flat" ? "flat" : "main"} level={appearance === "flat" ? "primary" : "tertiary"} size="md" icon={icon} aria-label={name} tooltip={tooltip ?? label} />)}
      {unread ? <NotificationDot className="zen-app-shell-action__number" tone={tone} value={unread > 99 ? "99+" : unread} />
        : dot ? <NotificationDot className="zen-app-shell-action__dot" tone={tone} /> : null}
    </span>
  );
}

export interface AppShellAccountProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** The signed-in person's name: the accessible name (“Account: Ava Chen”), the tooltip and the initials without a photo. */
  name: string;
  /** Photo URL (Figma Avatar/Single Theme=Photo). */
  src?: string;
  /** Initials colour without a photo. Default neutral. */
  theme?: Exclude<AvatarTheme, "photo">;
  /** Figma instance overrides: props of the avatar it draws, by layer (`{ Avatar: { shape: "square" } }`). Written by Zen Studio;
   *  app code sets src / theme. */
  overrides?: NestedOverrides;
  /** Ref to the account button element, so it can be a `<Menu trigger>`. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * The account button at the end of the header's top row: Figma Avatar/Single Circle Medium (Image-Size/Medium) as a
 * button. Put it in a Menu for the account actions: `<Menu align="end" trigger={<AppShellAccount name="Ava Chen" src={photo} />} items={…} />`.
 * Keyboard focus shows the Avatar's own focus ring.
 */
export function AppShellAccount({ name, src, theme = "neutral", className, type = "button", onFocus, onBlur, "aria-label": ariaLabel, overrides, ref, ...buttonProps }: AppShellAccountProps) {
  const t = useZenLabels();
  const nest = useNested(overrides);
  const accessibleName = ariaLabel ?? t.accountOf(name);
  const [ring, setRing] = useState(false);
  // Name tooltip after 1s of hover, at once on keyboard focus, never on touch (house rule for icon-only controls).
  const tip = useIconTooltip(name, { placement: "bottom" });
  // bind() chains the tooltip's pointer and focus handlers after the caller's own (a Menu trigger passes some).
  const bound = tip.bind({
    ...buttonProps,
    onFocus: (event: FocusEvent<HTMLButtonElement>) => { setRing(event.currentTarget.matches(":focus-visible")); onFocus?.(event); },
    onBlur: (event: FocusEvent<HTMLButtonElement>) => { setRing(false); onBlur?.(event); },
  });
  return (
    <>
      <button {...bound} ref={ref} type={type} className={["zen-app-shell-account", className].filter(Boolean).join(" ")} aria-label={accessibleName}>
        {/* Without a photo, alt only generates the initials ("Ava Chen" → AC); the button's aria-label names it. */}
        {nest("Avatar", <Avatar size="md" theme={src ? "photo" : theme} background="subtle" src={src} alt={src ? "" : name} focus={ring} />)}
      </button>
      {tip.tooltip}
    </>
  );
}
