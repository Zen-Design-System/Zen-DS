# Session log 2026-10-28

## Session "Bug" · Input error focus ring (tier XS; user screenshot: "phần focus lúc lỗi này đổi phần neutral focus qua negative")

- input.css "Error + focus" (code-only: Figma has no Error-Focused state): the 3px outside ring on an invalid field is
  now --zen-color-focus-negative-subtle (light negative-alpha-4, dark too) instead of focus-neutral-subtle; the Negative
  border stays. One rule; Select/Textarea/date fields share .zen-input-field. style:check ✓.
