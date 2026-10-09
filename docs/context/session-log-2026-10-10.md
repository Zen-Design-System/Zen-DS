# Session log 2026-10-10

## Studio: components "không giống với gốc" — Sidebar rows on their own, slot props as switches, Page header / Screen header slots (user: "sao có 1 số component lỗi không giống với gốc?", "breadcrumb … hiện label chứ k phải component breadcrumb thật … nên là slot cho phép thêm item vào", "Header page cũng nên là slot") — tier M, session 604bd7

- Causes found on the user's page (.zen-studio/pages/untitled-page.zen.tsx): a SidebarMenuItem in the page's Stack drew
  without padding or icon gap (sidebar.css `.zen-sidebar__item` read --zen-sidebar-item-padding / -gap, defined only on
  `.zen-sidebar`, no fallback); every Menu item insert wrote `id="invoices"` (the Sidebar keys rows by id); PageHeader
  has no Figma groups, so its ReactNode props (breadcrumbs, meta, tabs) got the generic text field and "on" wrote a text
  label. A scratch scan of component CSS for parent-scoped variables read without a fallback found 196 reads, all a
  component's own inner parts except the Sidebar row (the only child component the palette lets you place alone).
- Fixed: sidebar.css fallbacks (Padding/Small, Gap/Small); palette Menu item / Menu section ids get a short suffix of
  the insert's uid; Breadcrumbs gets a builder version (a static trail: a builder page keeps no handlers); new "Tab bar"
  palette item (Tabs without panels or state).
- Slots: registry PageHeader breadcrumbs (Figma Header Type=Navigation › Leading-Slots holds a Breadcrumbs), meta,
  tabs; builder Screen header (Figma Header Type=Custom: one free slot). palette.selftest reads the builder runtime for
  Screen (ScreenProps, the conditional header mount, builder.css). DesignPanel: a node prop that is a content slot is a
  ToggleRow (GroupedProperties' Figma boolean, now exported); a slot that takes one component inserts it at once through
  paletteFor (the builder versions), else the picker opens.
- Export fix found on the way (peer's note): Export › HTML kept a Screen's app frame wrappers as
  studio-builder-screen__* with no rules in styles.css (only .zen- rules pass), so a page with a Sidebar or a Page header
  stacked. htmlExport.tsx renames them (.screen__side/__main/__header/__content/__top/__bottom) and styleRule keeps
  builder.css's app frame rules renamed (appFrameRule). E2E HO-08 (desktop Screen + Sidebar + PageHeader, 0.00% from the
  canvas; the canvas shot hides the side panels first: a 1440 px frame is wider than the canvas between them).
- Tests: palette selftest 1,532 (+ --deep 1,535); E2E B-27 and SP-08 updated (Menu item ids `invoices-…`, five
  PageHeader slots), B-28
  (Breadcrumbs on → real Breadcrumbs, Item-List 2 → 3; Screen › Header + Search; a Menu item outside a Sidebar keeps
  12px padding and gap).
