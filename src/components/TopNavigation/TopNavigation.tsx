import { useEffect, useId, useRef, useState, type ReactElement, type ReactNode, type RefObject } from "react";
import type { IconName } from "../Icon";
import { usePresence } from "../Motion";
import { useIconTooltip } from "../Tooltip";
import { renderIcon } from "../_shared/icon";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./top-navigation.css";
import "../Icon/core";

/**
 * Figma Top-Navigation/Mobile (12014:45167) Type. Each type pairs a background with a Nav-Action style:
 * - default · alt: Surface/Default · Surface/Alt + Nav-Action/Icon-Main Tertiary (44px, bordered).
 * - default-blurring · alt-blurring: the surface fading to transparent (…-Bluring-End) + background blur, Tertiary actions.
 * - liquid-glass: Alt blurring + Nav-Action/Liquid-Glass actions.
 * - default-overlay · liquid-overlay: a Black-Overlay gradient over media + Liquid-Glass Black-Overlay actions, white content.
 * - compact · compact-alt · compact-overlay: the same backgrounds with Nav-Action/Flat (icon-only) actions.
 */
/** Figma Type=*-Bluring / Liquid Glass / *-Overlay: BACKGROUND_BLUR blurType=PROGRESSIVE, start radius at the top edge
 *  (Default-Bluring 10, the rest 20) → 0 at the bottom edge, under the gradient fill. */
const PROGRESSIVE_TYPES = new Set<string>(["default-blurring", "alt-blurring", "liquid-glass", "default-overlay", "liquid-overlay", "compact-overlay"]);

export const topNavigationTypes = ["default", "alt", "default-blurring", "alt-blurring", "liquid-glass", "default-overlay", "liquid-overlay", "compact", "compact-alt", "compact-overlay"] as const;
export type TopNavigationType = (typeof topNavigationTypes)[number];
/** Figma Margin: Comfortable (20px sides) · Compact (16px sides). */
export type TopNavigationMargin = "comfortable" | "compact";
/** The screen title's heading level; for the large title it is also Figma .Primitives/Heading-Text/Basic Type H1 · H2 · H3. */
export type TopNavigationHeading = "h1" | "h2" | "h3";

export interface TopNavigationAction {
  /** An icon name (drawn at 24px) or an element. */
  icon: IconName | ReactElement;
  /** Accessible name (the action is icon-only). */
  label: string;
  onClick?: () => void;
  /** Figma Noti-Dot: an 8px Negative dot with a 2px Border/Inverse ring. */
  dot?: boolean;
  disabled?: boolean;
  /**
   * In `trailing`: actions next to each other with the same `group` share one pill, Figma's Nav-Action with a trailing
   * icon (iOS's paired bar buttons), e.g. audio + video call with `group: "call"`. The pill takes the bar's action style:
   * Tertiary (Icon-Main), Liquid Glass, or Liquid Glass Black Overlay on the overlay types; each half keeps its own label
   * and tooltip. Figma's pill holds two. A pill counts as one of the bar's three places. The compact types keep their Flat
   * actions apart (Figma's Nav-Action/Icon-Flat has no trailing icon). Ignored outside `trailing`.
   */
  group?: string;
}

export interface TopNavigationProps {
  type?: TopNavigationType;
  margin?: TopNavigationMargin;
  /**
   * Figma Heading-Text Type=Sub with Subheading / Leading (◆ Social conversation header): with either set, the bar title
   * becomes a left-aligned identity — a 48px `titleLeading` visual (Avatar / ChatAvatarGroup), gap 12, the title in
   * Body/Extra/Bold over the subtitle in Caption/Regular (Neutral/Light), gap 2. The identity title is the screen's
   * heading like any bar title; with `onTitleClick` the heading wraps the identity button.
   */
  subtitle?: ReactNode;
  titleLeading?: ReactNode;
  /** Makes the identity a button (open the profile / group info). */
  onTitleClick?: () => void;
  titleLabel?: string;
  /**
   * The first two trailing actions share one pill (see `TopNavigationAction.group`), when no action names a group.
   * @deprecated Give the actions that share a pill the same `group` (e.g. `group: "call"` on both).
   */
  trailingGroup?: boolean;
  /**
   * Figma Top-Heading-Text (Type=Sub, Body/Extra/Bold), centred in the navigator bar. Shown when collapsed or when there
   * is no large title, and then it is the screen's heading (`headingLevel`, h1 by default) in its bar style — a compact
   * or pushed screen's h1 is its bar title, so content headings start at h2. While the large title shows, the bar copy
   * is aria-hidden.
   */
  title?: ReactNode;
  /**
   * Figma Expand-Heading (Heading/1–3) under the navigator bar: a tab root's large title. While expanded it is the
   * screen's heading (h1 · Heading/1 by default); once `collapsed` it leaves and the bar title (`title`, else this text)
   * becomes the heading, so the screen keeps exactly one h1 before and after scrolling.
   */
  largeTitle?: ReactNode;
  /**
   * Level of the screen title — the large title while it shows, else the bar title. Default h1: the title names the
   * screen (match `document.title` to it). Use h2 / h3 only for a navigation stack nested inside another screen that
   * already has its h1. The large title's style follows the level (h1 Heading/1 · h2 Heading/2 · h3 Heading/3); the
   * bar title stays Body/Extra/Bold at every level.
   */
  headingLevel?: TopNavigationHeading;
  /** Figma Top-Leading: an action (usually Back) or a visual (e.g. an Avatar). */
  leading?: TopNavigationAction | ReactNode;
  /** Figma Top-Trailing: up to three actions (its Trailing-Slot takes 3); more are not drawn. */
  trailing?: TopNavigationAction[];
  /**
   * Figma Expand-Trailing (Header-Trailing): one action, or a list of up to three, beside the large title. When the bar
   * row folds into the large-title row (a root, see `topBar`) they sit first in the trailing slot, so they stay in place
   * and in reach once the title folds; the bar still draws three actions in all.
   */
  largeTitleAction?: TopNavigationAction | TopNavigationAction[];
  /**
   * Figma Top-bar: the navigator-bar row. By default a root (a large title and no `leading`) hides it while the large title
   * shows, as Figma's root screens do (Top-bar=false): the trailing actions sit at the right of the large-title row, and
   * once the title folds the bar title shows in that same row, so the header keeps its height. `true` keeps the row
   * above the large title (the iOS layout); `false` hides it on any screen with a large title.
   */
  topBar?: boolean;
  /** Figma Control-Bar slot (48px): a Search, Segmented or Tabs under the heading. */
  controlBar?: ReactNode;
  /**
   * A status that must stay in view while the screen scrolls (offline, syncing, read-only): a Small AlertBanner pinned
   * under the bar and the control bar, edge to edge. It never scrolls away; with `scrollRef` it moves up with the fold,
   * like a pinned control bar. One banner at a time; the screen's content starts below it.
   */
  banner?: ReactNode;
  /**
   * For a Search control bar: while `collapsed`, the bar folds away and this Search action appears at the start of the
   * trailing slot (top-right); it leaves again when the bar expands. Its `onClick` usually scrolls back up and focuses
   * the field. Counts toward the three trailing actions, so keep at most two others. `label` defaults to the locale's
   * “Search”, `icon` to icon-search-medium-line (an icon name or an element).
   */
  searchAction?: { onClick: () => void; label?: string; icon?: IconName | ReactElement };
  /**
   * Scroll-linked collapse (the iOS large-title behaviour): the element whose scroll moves the screen's content, or
   * "window". The large title (and a Search Control-Bar with `searchAction`) slide up under the bar with the content,
   * 1:1, never jumping; the bar title fades in once the large title is covered; a scroll that stops half-way settles
   * open or closed; once content runs under the bar, the opaque types (default · alt · compact · compact-alt) get a
   * Border/Neutral/Pale rule under the bar. The header must overlay the scrolled content: `sticky` as the scroller's
   * first child, or positioned over it. A `collapsed` value overrides it.
   */
  scrollRef?: RefObject<HTMLElement | null> | "window";
  /** Collapsed by hand: hides the large title and shows `title` (or the large title) in the navigator bar. Prefer
   *  `scrollRef`, which follows the scroll; with `collapsed` set, the scroll does not change it. */
  collapsed?: boolean;
  /** Stick to the top of the scroll container. */
  sticky?: boolean;
  "aria-label"?: string;
  className?: string;
}

const isAction = (value: unknown): value is TopNavigationAction => typeof value === "object" && value !== null && "icon" in value && "label" in value;

/** Figma Trailing-Slot maxChildren (Top-Trailing and Header-Trailing, `.Primitives/Mobile/Top-Navigation/Trailling` 12013:39571). */
const MAX_ACTIONS = 3;
const actionStyleFor = (type: TopNavigationType) =>
  type.startsWith("compact") ? "flat" : type === "liquid-glass" ? "glass" : type === "default-overlay" || type === "liquid-overlay" ? "glass-dark" : "default";

/**
 * The trailing slot in Figma Trailing-Slot terms (up to `slots` items): one action per item, or a run of actions next to
 * each other with the same `group` as one item, the dual Nav-Action (`firstTwo`: the deprecated `trailingGroup`, used
 * only when no action names a group). On a root the large-title actions (`lead`) come first. Flat (compact) actions
 * have no container, and Figma's Nav-Action/Icon-Flat no trailing icon, so they never pair (`pairs` false).
 */
function trailingItems(lead: TopNavigationAction[], trailing: TopNavigationAction[], pairs: boolean, firstTwo: boolean, slots: number): TopNavigationAction[][] {
  const own: TopNavigationAction[][] = [];
  const named = trailing.some((action) => action.group);
  trailing.forEach((action, index) => {
    const last = own[own.length - 1];
    const prev = trailing[index - 1];
    const joins = pairs && last && (named ? Boolean(action.group) && action.group === prev?.group : firstTwo && index === 1);
    if (joins) last.push(action);
    else own.push([action]);
  });
  return [...lead.map((action) => [action]), ...own].slice(0, slots);
}

/** Figma Nav-Action (Icon-Main Tertiary · Flat · Liquid-Glass): a 44px circle with a 24px icon. */
export function TopNavigationActionButton({ action, variant, className, state }: { action: TopNavigationAction; variant: string; className?: string; state?: "open" | "closing" }) {
  // Icon-only: the label shows as a tooltip after 1s hover (Zen rule); below the bar so it never covers the status bar.
  const tip = useIconTooltip(state === "closing" ? false : action.label, { placement: "bottom" });
  return (
    <button type="button" className={["zen-top-nav__action", className].filter(Boolean).join(" ")} data-style={variant} data-state={state} aria-label={action.label} disabled={action.disabled} {...tip.bind({ onClick: action.onClick })}>
      {renderIcon(action.icon)}
      {action.dot ? <span className="zen-top-nav__dot" aria-hidden="true" /> : null}
      {tip.tooltip}
    </button>
  );
}

/**
 * Figma Top-Navigation/Mobile (12014:45167, page ❖ Top-Navigations): a 64px navigator bar (Top-Leading 44px action ·
 * centred Sub heading · Top-Trailing) over an optional 64px Expand-Heading (H1–H3 + one action) and a Control-Bar slot.
 * The OS status bar is not part of the component; leave room for it with `env(safe-area-inset-top)`.
 * Outline: the screen always exposes exactly one title heading (`headingLevel`, h1 by default) — the large title
 * (Heading/1) while it shows, otherwise the bar title in its own Body/Extra/Bold style; never both.
 */
/** Keeps the large-title row clear of the bar's trailing actions that sit over it on a root (Top-bar=false): an invisible
 *  copy of the trailing slot with one placeholder per action (a pair keeps its pill), so the title ellipsizes before it
 *  runs under them. */
function ActionsRoom({ items, variant }: { items: TopNavigationAction[][]; variant: string }) {
  if (!items.length) return null;
  return (
    <span className="zen-top-nav__trailing zen-top-nav__trailing--room" aria-hidden="true">
      {items.map((item, index) => item.length > 1
        ? <span key={index} className="zen-top-nav__group" data-style={variant}>{item.map((_, half) => <span key={half} className="zen-top-nav__action" data-style="flat-group" />)}</span>
        : <span key={index} className="zen-top-nav__action" data-style={variant} />)}
    </span>
  );
}

/** The scroll-linked state: how far the fold (large title + folding Search) has slid under the bar. */
type ScrollState = { covered: boolean; folded: boolean; scrolled: boolean };

/**
 * Follows `scrollRef` for TopNavigation: writes the fold offset to --zen-top-nav-fold on the header every scroll event
 * (no re-render per frame) and reports three thresholds — the large title covered (≤ 10px of it left), the fold fully
 * under the bar, content running under the bar. A scroll that ends inside the fold settles to the nearer end.
 * `foldNode` is the fold element itself (not a ref), so the effect measures and observes it again whenever it mounts
 * again: a screen without a large title unmounts it, and the next root screen brings a new node.
 */
function useScrollFold(scrollRef: TopNavigationProps["scrollRef"], linked: boolean, rootRef: RefObject<HTMLElement | null>, foldNode: HTMLDivElement | null, expandRef: RefObject<HTMLDivElement | null>, overlayBarRef: RefObject<HTMLDivElement | null> | null) {
  const [state, setState] = useState<ScrollState>({ covered: false, folded: false, scrolled: false });
  // A passive effect: the scroller usually renders after the header (a sibling below it), so its ref is only attached
  // once the whole commit is done.
  useEffect(() => {
    const root = rootRef.current;
    const scroller = scrollRef === "window" ? null : scrollRef?.current;
    if (!linked || !root || (scrollRef !== "window" && !scroller)) return undefined;
    const target: HTMLElement | Window = scroller ?? window;
    const read = () => (scroller ? scroller.scrollTop : window.scrollY);
    const room = () => (scroller ? scroller.scrollHeight - scroller.clientHeight : document.documentElement.scrollHeight - window.innerHeight);
    let fold = foldNode?.offsetHeight ?? 0;
    let expand = expandRef.current?.offsetHeight ?? 0;
    const apply = () => {
      const y = read();
      const offset = Math.min(Math.max(y, 0), fold);
      root.style.setProperty("--zen-top-nav-fold", `${offset}px`);
      // How far the header's own edge moves up: with the bar overlaying the large-title row (a root), the bar takes that
      // row's place once it folds, so only what lies below it (a folding Search) shrinks the header.
      const bar = overlayBarRef?.current?.offsetHeight ?? 0;
      root.style.setProperty("--zen-top-nav-shrink", `${Math.min(offset, Math.max(0, fold - bar))}px`);
      const next = { covered: expand > 0 && offset >= expand - 10, folded: fold > 0 && offset >= fold - 1, scrolled: y > fold };
      setState((current) => (current.covered === next.covered && current.folded === next.folded && current.scrolled === next.scrolled ? current : next));
    };
    // Settle a scroll that stopped inside the fold: under half of it back open, otherwise closed (iOS snaps the same way).
    const settle = () => {
      const y = read();
      if (y <= 0 || y >= fold) return;
      const top = y < fold / 2 ? 0 : fold;
      if (top > room()) return;
      const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    };
    const hasScrollEnd = "onscrollend" in window;
    let timer = 0;
    const onScroll = () => {
      apply();
      if (!hasScrollEnd) { window.clearTimeout(timer); timer = window.setTimeout(settle, 160); }
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    if (hasScrollEnd) target.addEventListener("scrollend", settle);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      fold = foldNode?.offsetHeight ?? 0;
      expand = expandRef.current?.offsetHeight ?? 0;
      apply();
    });
    if (foldNode) observer?.observe(foldNode);
    apply();
    return () => {
      window.clearTimeout(timer);
      target.removeEventListener("scroll", onScroll);
      if (hasScrollEnd) target.removeEventListener("scrollend", settle);
      observer?.disconnect();
      root.style.removeProperty("--zen-top-nav-fold");
      root.style.removeProperty("--zen-top-nav-shrink");
    };
  }, [linked, scrollRef, rootRef, foldNode, expandRef, overlayBarRef]);
  return state;
}

export function TopNavigation({ type = "default", margin = "comfortable", subtitle, titleLeading, onTitleClick, titleLabel, trailingGroup = false, title, largeTitle, headingLevel = "h1", leading, trailing = [], largeTitleAction, topBar, controlBar, banner, searchAction, scrollRef, collapsed: collapsedProp, sticky = false, "aria-label": ariaLabel, className }: TopNavigationProps) {
  const t = useZenLabels();
  const titleId = useId();
  const variant = actionStyleFor(type);
  const identity = Boolean(subtitle || titleLeading);
  const rootRef = useRef<HTMLElement>(null);
  // The fold is kept as state (a callback ref), so a fold that unmounts and mounts again (root → child → root) is
  // measured again and the bar keeps folding.
  const [foldNode, setFoldNode] = useState<HTMLDivElement | null>(null);
  const expandRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const linked = collapsedProp === undefined && scrollRef !== undefined;
  // Figma Top-bar=false (root screens): the bar row folds into the large-title row instead of sitting above it.
  const barFolds = Boolean(largeTitle) && !identity && (topBar === false || (topBar === undefined && !leading));
  const scroll = useScrollFold(scrollRef, linked, rootRef, foldNode, expandRef, barFolds && linked ? barRef : null);
  const collapsed = collapsedProp ?? (linked && scroll.covered);
  const showLarge = Boolean(largeTitle) && !collapsed;
  // The bar overlays the large-title row while that row is there (always when scroll-linked: the fold stays mounted).
  const barOverlay = barFolds && (linked || showLarge);
  const titleActions = largeTitleAction === undefined ? [] : Array.isArray(largeTitleAction) ? largeTitleAction : [largeTitleAction];
  const lead = barFolds ? titleActions : [];
  const pairs = variant !== "flat";
  // Each action object is passed on as it is (the Studio ties a rendered button to its item by identity).
  const expandTrailing = titleActions.length ? <div className="zen-top-nav__expand-trailing">{titleActions.slice(0, MAX_ACTIONS).map((action, index) => <TopNavigationActionButton key={index} action={action} variant={variant} />)}</div> : null;
  const barTitle = title ?? (collapsed ? largeTitle : undefined);
  // One title heading at all times: the large title while it shows, else the bar title (the copy under a large title is aria-hidden).
  const barIsTitle = Boolean(barTitle) && !showLarge;
  const Heading = headingLevel;
  const headingStyle = headingLevel === "h1" ? "Heading/1" : headingLevel === "h2" ? "Heading/2" : "Heading/3";
  const progressive = PROGRESSIVE_TYPES.has(type);
  // Search control bar ⇄ trailing Search action: the bar shows while expanded, the action while collapsed (scroll-linked:
  // once the Search has slid fully under the bar).
  const foldsSearch = Boolean(searchAction && controlBar);
  const search = usePresence(foldsSearch && (linked ? scroll.folded : collapsed), 120);
  const searchButton: TopNavigationAction | null = searchAction ? { icon: searchAction.icon ?? "icon-search-medium-line", label: searchAction.label ?? t.search, onClick: searchAction.onClick } : null;
  return (
    <header ref={rootRef} className={["zen-top-nav", className].filter(Boolean).join(" ")} data-type={type} data-margin={margin} data-collapsed={collapsed ? "true" : undefined} data-sticky={sticky ? "true" : undefined} data-scroll-linked={linked ? "true" : undefined} data-scrolled={linked && scroll.scrolled ? "true" : undefined} data-bar={barOverlay ? "overlay" : undefined} aria-label={ariaLabel}>
      {progressive ? <span className="zen-top-nav__progressive" aria-hidden="true"><i /><i /><i /><i /><i /></span> : null}
      <div ref={barRef} className="zen-top-nav__bar">
        <div className="zen-top-nav__leading">
          {isAction(leading) ? <TopNavigationActionButton action={leading} variant={variant} /> : leading}
        </div>
        {identity ? (() => {
          // A heading cannot sit inside a button (its children are presentational), so a clickable identity is wrapped
          // by the heading; a static one makes its title line the heading.
          const IdentityText = onTitleClick ? "span" : "div";
          const IdentityTitle = !onTitleClick && barIsTitle ? Heading : "span";
          const content = (
            <>
              {titleLeading ? <span className="zen-top-nav__identity-leading">{titleLeading}</span> : null}
              <IdentityText className="zen-top-nav__identity-text">
                <IdentityTitle id={titleId} className={`zen-top-nav__identity-title ${typographyStyles["Body/Extra/Bold"]}`}>{barTitle}</IdentityTitle>
                {subtitle ? <span className={`zen-top-nav__identity-subtitle ${typographyStyles["Caption/Regular"]}`}>{subtitle}</span> : null}
              </IdentityText>
            </>
          );
          if (!onTitleClick) return <div className="zen-top-nav__identity">{content}</div>;
          const button = <button type="button" className="zen-top-nav__identity" onClick={onTitleClick} aria-label={titleLabel}>{content}</button>;
          // The heading is named by the title alone, not by the button's longer label ("Ava Chen, active now. Open details").
          return barIsTitle ? <Heading className="zen-top-nav__identity-heading" aria-labelledby={titleId}>{button}</Heading> : button;
        })() : (
          // One element that stays mounted, so it can fade in as the large title folds away; it takes the heading role
          // (role=heading + aria-level, as React Navigation does) only while it is the screen's title.
          <div className={`zen-top-nav__title ${typographyStyles["Body/Extra/Bold"]}`} data-visible={barIsTitle ? "true" : "false"} role={barIsTitle ? "heading" : undefined} aria-level={barIsTitle ? Number(headingLevel.slice(1)) : undefined} aria-hidden={barIsTitle ? undefined : true}>
            {barTitle}
          </div>
        )}
        <div className="zen-top-nav__trailing">
          {search.mounted && searchButton ? <TopNavigationActionButton action={searchButton} variant={variant} className="zen-top-nav__search" state={search.phase} /> : null}
          {/* Keyed by position: a label that changes (a count clearing, Like → Unlike) must not remount the button and drop its focus. */}
          {trailingItems(lead, trailing, pairs, trailingGroup, search.mounted && searchButton ? MAX_ACTIONS - 1 : MAX_ACTIONS).map((item, index) => item.length > 1
            // The dual Nav-Action: one pill in the bar's action style, two halves that each keep their target and name.
            ? <span key={index} className="zen-top-nav__group" data-style={variant} role="group">{item.map((action, half) => <TopNavigationActionButton key={half} action={action} variant="flat-group" />)}</span>
            : <TopNavigationActionButton key={index} action={item[0]} variant={variant} />)}
        </div>
      </div>
      {linked ? (
        <>
          {/* Scroll-linked: the fold stays mounted and slides under the bar; a covered part is inert (no focus on what
              cannot be seen). The large title is the heading only while it shows. */}
          {largeTitle || foldsSearch ? (
            <div ref={setFoldNode} className="zen-top-nav__fold">
              {largeTitle ? (
                <div ref={expandRef} className="zen-top-nav__expand" inert={collapsed || undefined}>
                  {showLarge
                    ? <Heading className={`zen-top-nav__heading ${typographyStyles[headingStyle]}`} data-level={headingLevel}>{largeTitle}</Heading>
                    : <div className={`zen-top-nav__heading ${typographyStyles[headingStyle]}`} data-level={headingLevel} aria-hidden="true">{largeTitle}</div>}
                  {barFolds ? <ActionsRoom items={trailingItems(lead, trailing, pairs, trailingGroup, MAX_ACTIONS)} variant={variant} /> : expandTrailing}
                </div>
              ) : null}
              {foldsSearch ? <div className="zen-top-nav__control" inert={scroll.folded || undefined}>{controlBar}</div> : null}
            </div>
          ) : null}
          {/* A Segmented or Tabs Control-Bar stays pinned under the bar; it moves up with the fold. So does a banner. */}
          {controlBar && !foldsSearch ? <div className="zen-top-nav__control zen-top-nav__control--pinned">{controlBar}</div> : null}
          {banner ? <div className="zen-top-nav__banner zen-top-nav__banner--pinned">{banner}</div> : null}
        </>
      ) : (
        <>
          {showLarge ? (
            <div className="zen-top-nav__expand">
              <Heading className={`zen-top-nav__heading ${typographyStyles[headingStyle]}`} data-level={headingLevel}>{largeTitle}</Heading>
              {barFolds ? <ActionsRoom items={trailingItems(lead, trailing, pairs, trailingGroup, MAX_ACTIONS)} variant={variant} /> : expandTrailing}
            </div>
          ) : null}
          {controlBar && !(foldsSearch && collapsed) ? <div className="zen-top-nav__control">{controlBar}</div> : null}
          {banner ? <div className="zen-top-nav__banner">{banner}</div> : null}
        </>
      )}
    </header>
  );
}
