import type { ParitySpec } from "../../../parity";

// `format` and `size` are named types in the props docs, so the generated matrix reaches neither: one case per member.
const formats = ["doc", "pdf", "sheet", "zip", "photo", "video", "music", "sound", "record", "figma"] as const;
const sizes = ["2xs", "xs", "sm", "base", "md", "lg", "xl", "2xl", "3xl"] as const;

export default {
  FileIcon: {
    base: { format: "doc" },
    cases: [
      ...formats.map((format) => ({ format })),
      ...sizes.map((size) => ({ size })),
      { size: 32 },
      { title: "Brief.pdf", format: "pdf" },
      { format: "exe", $label: "unknown format renders nothing" },
      { size: 24, style: { opacity: 0.5, width: "10px" }, $label: "a px size wins over the caller's width" },
      { class: "row-file", id: "file", "aria-label": "Brief", "data-testid": "file", "data-format": "ignored" },
    ],
  },
} satisfies ParitySpec;
