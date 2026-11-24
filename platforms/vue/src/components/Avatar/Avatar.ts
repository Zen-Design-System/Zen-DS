import { defineComponent, h, type PropType, type SlotsType, type VNodeChild } from "vue";
import {
  avatarInitials,
  avatarModel,
  avatarSizes,
  avatarStackModel,
  avatarStatusModel,
  isAvatarStackRootProp,
  scaleKey,
  type AvatarBackground,
  type AvatarShape,
  type AvatarSize,
  type AvatarStatusSize,
  type AvatarStatusValue,
  type AvatarTheme,
  type ZenLabels,
} from "@zen-ds/core";
import { dataAttrs } from "../../_shared/attrs";
import { useZenLabels } from "../../_shared/context";
import { hasContent, slotText } from "../../_shared/slots";

export {
  avatarSizes,
  avatarStatuses,
  avatarStatusSizes,
  avatarThemes,
  type AvatarBackground,
  type AvatarShape,
  type AvatarSize,
  type AvatarStatusSize,
  type AvatarStatusValue,
  type AvatarTheme,
} from "@zen-ds/core";

/**
 * Figma .Primitives/Avatar/Status (217:7418), React: components/Avatar. A rounded dot with an outside Color/Border/Inverse
 * ring, on its own (a presence mark beside a name) or as an Avatar's `status`. Takes `class` and `data-*` attributes, as
 * React's.
 */
export const AvatarStatus = defineComponent({
  name: "AvatarStatus",
  inheritAttrs: false,
  props: {
    /** Active (Positive) · Disabled (Solid-Disabled) · Pending (Warning) · Inactive (Negative). */
    status: { type: String as PropType<AvatarStatusValue>, default: "active" },
    /** XSmall 4px with a 1px ring · Small 8/2 · Medium 12/2 · Large 16/3. Short or Figma spelling. */
    size: { type: String as PropType<AvatarStatusSize>, default: "sm" },
    /** What a screen reader says. Default: the status word from the labels ("Online", "Disabled"…). */
    label: { type: String },
    /** Hide the dot from assistive technology when the status is said in text beside it. */
    decorative: { type: Boolean, default: false },
  },
  setup(props, { attrs }) {
    const labels = useZenLabels();
    return () => h("span", { ...dataAttrs(attrs), class: ["zen-avatar-status", attrs.class], ...avatarStatusModel(props, labels.value) });
  },
});

const avatarProps = {
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size: { type: String as PropType<AvatarSize>, default: "md" },
  theme: { type: String as PropType<AvatarTheme>, default: "neutral" },
  background: { type: String as PropType<AvatarBackground>, default: "solid" },
  shape: { type: String as PropType<AvatarShape>, default: "circle" as const },
  /**
   * The status dot at the bottom-right: `true` or "active" (read as "Online"), "disabled", "pending" or "inactive". The dot
   * is never the only signal: say the status in text beside the avatar too.
   */
  status: { type: [Boolean, String] as PropType<boolean | AvatarStatusValue>, default: false },
  focus: { type: Boolean, default: false },
};

type AvatarLook = { size: AvatarSize; theme: AvatarTheme; background: AvatarBackground; shape: AvatarShape; status: boolean | AvatarStatusValue; focus: boolean; src?: string; alt: string };

/**
 * One avatar's markup. `text` is the label when it is only text (cut to initials); any other content shows as it is, and
 * with none the initials come from `alt`. AvatarStack's "+N" chip draws through here too, as content, so a long count is
 * not cut (React passes it as `+{remaining}`, which is not a string).
 */
function drawAvatar(look: AvatarLook, labels: ZenLabels, root: Record<string, unknown>, content: VNodeChild, text: string | undefined) {
  const avatar = avatarModel(look, labels);
  const initials = text !== undefined ? avatarInitials(avatar.size, text, look.alt) : hasContent(content) ? content : avatarInitials(avatar.size, undefined, look.alt);
  return h("span", {
    ...root,
    "data-size": avatar.size,
    "data-tone": look.theme,
    "data-background": look.background,
    "data-shape": look.shape,
    "data-focus": look.focus ? "true" : "false",
    role: avatar.role,
    "aria-label": avatar.ariaLabel,
  }, [
    h("span", { class: "zen-avatar__inner" }, [
      look.src ? h("img", { src: look.src, alt: look.alt }) : h("span", { class: avatar.initialsClass, "aria-hidden": avatar.initialsHidden }, [initials]),
    ]),
    avatar.status ? h(AvatarStatus, { class: "zen-avatar__status", status: avatar.status, size: avatar.statusSize, decorative: avatar.named }) : null,
  ]);
}

/**
 * Figma Avatar/Single (Medium 223:8784 … 3XLarge 223:8714), React: components/Avatar. A photo (`src`) or initials (the
 * default slot, else the first letters of `alt`) on the theme fill, with an optional status dot. `alt` is the person's
 * name: the photo's alt text, or the initials avatar's accessible name; `alt=""` makes it decorative. Takes `class` and
 * `data-*` attributes, as React's.
 */
export const Avatar = defineComponent({
  name: "Avatar",
  inheritAttrs: false,
  props: {
    ...avatarProps,
    src: { type: String },
    /** The person's name (see above). */
    alt: { type: String, default: "" },
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const labels = useZenLabels();
    return () => {
      const children = slots.default?.();
      return drawAvatar(props, labels.value, { ...dataAttrs(attrs), class: ["zen-avatar", attrs.class] }, children, slotText(children));
    };
  },
});

/**
 * Figma Avatar/Stack, React: components/Avatar. 1–5 avatars from `items`, first on top; `showMore` adds a "+N" chip for
 * the ones past `max`. `theme`, `background`, `shape`, `status` and `focus` go to every avatar (an item's own `theme`
 * wins). The stack's `class`, `style`, `id`, `title`, `aria-*` and `data-*` attributes go on its root.
 */
export const AvatarStack = defineComponent({
  name: "AvatarStack",
  inheritAttrs: false,
  props: {
    items: { type: Array as PropType<Array<{ src?: string; alt?: string; children?: VNodeChild; theme?: AvatarTheme }>>, required: true },
    max: { type: Number, default: 5 },
    showMore: { type: Boolean, default: false },
    size: avatarProps.size,
    // Unset, these leave each Avatar's own default (as React's spread of undefined props does).
    theme: { type: String as PropType<AvatarTheme> },
    background: { type: String as PropType<AvatarBackground> },
    shape: { type: String as PropType<AvatarShape> },
    status: { type: [Boolean, String] as PropType<boolean | AvatarStatusValue>, default: undefined },
    focus: { type: Boolean, default: undefined },
  },
  setup(props, { attrs }) {
    const labels = useZenLabels();
    return () => {
      const size = scaleKey(props.size, avatarSizes);
      const { visible, remaining } = avatarStackModel(props.items, props.max);
      const root = Object.fromEntries(Object.entries(attrs).filter(([name]) => name === "class" || isAvatarStackRootProp(name)));
      const shared = { theme: props.theme, background: props.background, shape: props.shape, status: props.status, focus: props.focus };
      const more = props.showMore && remaining > 0
        ? drawAvatar({
          size,
          theme: "neutral",
          background: "subtle",
          shape: shared.shape ?? avatarProps.shape.default,
          status: shared.status ?? avatarProps.status.default,
          focus: shared.focus ?? avatarProps.focus.default,
          alt: `+${remaining}`,
        }, labels.value, { class: ["zen-avatar", "zen-avatar-stack__item"] }, `+${remaining}`, undefined)
        : null;
      return h("span", { ...root, class: ["zen-avatar-stack", attrs.class], "data-size": size }, [
        ...visible.map(({ children, ...item }, index) => h(Avatar, { key: `${item.alt ?? "avatar"}-${index}`, ...shared, ...item, size, class: "zen-avatar-stack__item" }, children === undefined || children === null ? undefined : { default: () => children })),
        more,
      ]);
    };
  },
});
