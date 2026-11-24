/*
 * The web core (Code view P3, plan docs/research/code-languages-plan-2026-10-03.md §3.C): the framework-free logic
 * React and the web ports (Vue today, Svelte later) share, so a port imports it instead of copying it. Nothing it reaches
 * imports React, a stylesheet or the DOM at load (npm run vue:check proves it).
 *
 * The modules stay beside the React code that uses them: a component's own part is a `model.ts` in its folder (moved out
 * of its .tsx: levels, sizes, what the root and its parts render for a set of props), shared helpers stay in
 * components/_shared. So React's imports and the QA gate's rules (a component folder's files map to its page) do not
 * move; this file is the one entry the ports read.
 */

// Shared helpers
export * from "../components/_shared/scale";
export { contentToneAliases, contentToneGroups, contentTones, contentToneToken, contentToneVar, resolveContentTone, type ContentTone } from "../components/_shared/contentTone";
export { toneFromStatus, type StatusAlias } from "../components/_shared/status";
export { dataAttributes } from "../components/_shared/data-attributes";
export { isPerBreakpoint, resolveAt, type Responsive, type ResponsiveBreakpoint } from "../components/_shared/responsive";
export { fixedLayerSpace, visibleBounds, type LayerSpace } from "../components/_shared/layer-space";
export { resolveZenLabels, zenLabels, type ZenLabelOverrides, type ZenLabels } from "../components/_shared/labels";
export { typographyStyles, type TypographyStyleName } from "../tokens/typography.generated";
export { cornerRadiusValue, cornerSmoothingStyle, type CornerRadiusProps, type CornerSmoothingProps } from "../components/_shared/corners";
export { gradientStyle, type ZenGradient } from "../components/_shared/gradient";
export { imageFillMode, imageFillModes, imageFillStyle, knownPictureSize, pictureSizeProbe, shownPicture, type ImageCrop, type ImageFillMode, type ImageFillProps, type PictureSize } from "../components/_shared/image-fill";
export { frameModeScope, zenModeAttributes, type ZenModeAxis } from "../components/_shared/modes";

// Icons: the registry, the core set components draw, the names
export { getRegisteredIcon, loadIconBucket, preloadIcons, registerIcons, resolveIconName, warnUnknownIcon } from "../components/Icon/registry";
export { coreIcons } from "../icons/generated/core";
export { iconNames, type IconColorMode, type IconDefinition, type IconName } from "../icons/generated/names";

// Components' own parts
export * from "../components/Badge/model";
export * from "../components/Button/model";
export * from "../components/Divider/model";
export * from "../components/Icon/model";
export * from "../components/Link/model";
export * from "../components/Tooltip/model";
export * from "../components/VisuallyHidden/model";
export * from "../components/Stepper/model";
export * from "../components/AlertBanner/model";
export * from "../components/InlineMessage/model";
export * from "../components/EmptyState/model";
export * from "../components/DockIcon/model";
export * from "../components/FileIcon/model";
export * from "../components/FileIcon/fileIconData";
export * from "../components/ColorSelector/model";
export * from "../components/Avatar/model";
export * from "../components/Progress/model";
export * from "../components/Skeleton/model";
export * from "../components/Layout/model";
export * from "../components/Layout/sizing";
export * from "../components/Layout/position";
export * from "../components/Layout/effects";
export * from "../components/Layout/appearance";
export * from "../components/Layout/cell";
export * from "../components/Layout/mask-outline";
export * from "../components/Text/model";
export * from "../components/MetricWidget/model";
export * from "../components/ListItem/model";
export * from "../components/PageHeader/model";
