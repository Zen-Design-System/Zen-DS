import { defineComponent, h, type PropType } from "vue";
import { fileIconModel, type FileIconFormat, type IconSize } from "@zen-ds/core";
import { restAttrs } from "../../_shared/attrs";

export { fileIconData, fileIconFormatOf, fileIconFormats, type FileIconFormat } from "@zen-ds/core";

/**
 * Figma `icon-media-file` (Iconography → Special Icons → File), React: components/FileIcon. A coloured file shape with an
 * On-Colors glyph that identifies a content type — never an action icon. SVG attributes and listeners go to the `<svg>`.
 */
export const FileIcon = defineComponent({
  name: "FileIcon",
  inheritAttrs: false,
  props: {
    /** Figma `icon-media-file` Format (`fileIconFormatOf(name)` picks it from a file name). */
    format: { type: String as PropType<FileIconFormat>, required: true },
    /** Same scale as Icon (Element-Size/Popular) or a px number; Figma draws it at 20 (base). */
    size: { type: [String, Number] as PropType<IconSize | number>, default: "base" },
    /** Accessible name; without it the icon is decorative (the file name usually sits next to it). */
    title: { type: String },
  },
  setup(props, { attrs }) {
    return () => {
      const icon = fileIconModel(props.format, props.size);
      if (!icon) return null;
      return h("svg", {
        ...restAttrs(attrs),
        class: ["zen-icon", "zen-file-icon", attrs.class],
        "data-format": props.format,
        "data-tone": icon.tone,
        "data-size": icon.size,
        viewBox: "0 0 20 20",
        role: props.title ? "img" : undefined,
        "aria-hidden": props.title ? undefined : true,
        focusable: "false",
        style: [attrs.style, icon.custom],
      }, [
        props.title ? h("title", props.title) : null,
        ...icon.paths.map((path) => h("path", { class: path.className, d: path.d, "fill-rule": path.evenodd ? "evenodd" : undefined, "clip-rule": path.evenodd ? "evenodd" : undefined })),
      ]);
    };
  },
});
