// TopNavigation ↔ Figma Top-Navigation/Mobile (12014:45167), shared by figma-push.mjs and figma-pull.mjs. Read from the
// live file 9nZv4uW2LT21yuHabMTCh1 (2026-10-13). No imports: the push stays isomorphic.
//
// The set: Status-bar, then Navigator-bar › Wrapper › Top-Leading (.Primitives/Mobile/Top-Navigation/Leading, its
// Leading-Slot frame holding one Action), Top-Heading-Text (.Primitives/Heading-Text/Basic Type=Sub), Wrapper ›
// Top-Trailing (…/Trailling, its SLOT Trailing-Slot of Actions); Expand-Heading › Main-Heading-Text (Heading-Text H1–H3)
// and Header-Trailing (…/Trailling); a hidden Control-Bar frame › SLOT Control-Slot. Each Action is
// .Primitives/Top-Navigation/Mobile/Nav-Slot/Action (Style Default | Flat, Noti-Dot) whose Button is the Nav-Action set
// the variant's Type draws.

export const TOP_NAV_SET = { id: "12014:45167", name: "Top-Navigation/Mobile" };
export const NAV_ACTION_SET = { id: "6340:42675", name: ".Primitives/Top-Navigation/Mobile/Nav-Slot/Action" };
const NAV_BUTTONS = {
  main: { id: "6085:33688", name: "Nav-Action/Icon-Main" },
  flat: { id: "6085:32944", name: "Nav-Action/Icon-Flat" },
  overlay: { id: "6085:33284", name: "Nav-Action/Icon-Overlay" },
  glass: { id: "12015:46174", name: "Nav-Action/Liquid-Glass" },
};

/**
 * TopNavigation `type` → Figma Type, and the action each variant draws: the Action's Style, its Button's set and Level
 * (Default: Icon-Main Tertiary; Compact: Flat › Icon-Flat Primary; Liquid Glass: Liquid-Glass Secondary; the overlays
 * and Alt-Bluring: Icon-Overlay or Liquid-Glass in their own Level).
 */
export const TOP_NAV_TYPES = {
  default: { option: "Default", style: "Default", button: NAV_BUTTONS.main, level: "Tertiary" },
  alt: { option: "Alt", style: "Default", button: NAV_BUTTONS.main, level: "Tertiary" },
  "default-blurring": { option: "Default-Bluring", style: "Default", button: NAV_BUTTONS.main, level: "Tertiary" },
  "alt-blurring": { option: "Alt-Bluring", style: "Default", button: NAV_BUTTONS.overlay, level: "Inverse" },
  "liquid-glass": { option: "Liquid Glass", style: "Default", button: NAV_BUTTONS.glass, level: "Secondary" },
  "default-overlay": { option: "Default-Overlay", style: "Default", button: NAV_BUTTONS.overlay, level: "Black Overlay" },
  "liquid-overlay": { option: "Liquid-Overaly", style: "Default", button: NAV_BUTTONS.glass, level: "Black Overlay" },
  compact: { option: "Compact", style: "Flat", button: NAV_BUTTONS.flat, level: "Primary" },
  "compact-alt": { option: "Compact-Alt", style: "Flat", button: NAV_BUTTONS.flat, level: "Primary" },
  "compact-overlay": { option: "Compact-Overlay", style: "Flat", button: NAV_BUTTONS.overlay, level: "Flat Overlay" },
  // A band's bar (AppShell mobileTop band / band-sheet, Pattern/AppShell/Mobile Top=Band): no fill; over a colour band its
  // content and actions turn on-colour (TopNavigation.tsx: Liquid-Glass actions).
  transparent: { option: "Transparent", style: "Default", button: NAV_BUTTONS.main, level: "Tertiary" },
  "transparent-on-color": { option: "Transparent-On-Color", style: "Default", button: NAV_BUTTONS.glass, level: "Secondary" },
};
/** Figma Type → TopNavigation `type` (the pull). */
export const TOP_NAV_TYPE_OF = Object.fromEntries(Object.entries(TOP_NAV_TYPES).map(([type, look]) => [look.option, type]));
/** The large title's Heading-Text Type by `headingLevel`. */
export const TOP_NAV_HEADING = { h1: "H1", h2: "H2", h3: "H3" };
/** At most three actions in a trailing slot (TopNavigation.tsx MAX_ACTIONS; Figma's Trailing-Slot takes three). */
export const TOP_NAV_MAX_ACTIONS = 3;

/**
 * The actions a trailing slot draws (TopNavigation.tsx trailingItems): `lead` first, then `trailing`, where actions that
 * share a `group` (or the first two with `firstTwo`) are one pill unless the style is flat; three items at most. Figma
 * has no shared pill, so each item's actions come back one by one, with `grouped` set when a pill joined some.
 */
export function topNavActions(lead, trailing, { flat = false, firstTwo = false } = {}) {
  const own = [];
  const named = trailing.some((action) => action.group);
  trailing.forEach((action, index) => {
    const last = own[own.length - 1];
    const joins = !flat && last && (named ? Boolean(action.group) && action.group === trailing[index - 1]?.group : firstTwo && index === 1);
    if (joins) last.push(action);
    else own.push([action]);
  });
  const items = [...lead.map((action) => [action]), ...own].slice(0, TOP_NAV_MAX_ACTIONS);
  return { actions: items.flat(), grouped: items.some((item) => item.length > 1) };
}

/**
 * Where the bar's parts show (TopNavigation.tsx, the static page: not collapsed): Figma Top-bar=false when the bar row
 * folds into the large-title row (a large title, no identity, and `topBar` false or unset without a leading action).
 */
export function topNavLayout({ largeTitle, title, subtitle, titleLeading, leading, topBar, collapsed }) {
  const identity = Boolean(subtitle || titleLeading);
  const barFolds = Boolean(largeTitle) && !identity && (topBar === false || (topBar === undefined && !leading));
  const showLarge = Boolean(largeTitle) && !collapsed;
  const barTitle = title || (collapsed ? largeTitle : undefined);
  return { identity, barFolds, showLarge, barTitle, barShowsTitle: identity || (Boolean(barTitle) && !showLarge) };
}
