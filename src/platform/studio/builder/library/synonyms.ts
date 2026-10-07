/*
 * What people type for a library item (Studio builder GĐ3 M1, spec docs/research/studio-builder-library-spec-2026-10-06.md
 * §3b), English and Vietnamese (the user's call, Q4). Each row: the terms (any case and marks; the search folds them,
 * so "hộp thoại" and "hop thoai" are one term; several words make a phrase) → palette item ids (slots/palette.ts), the
 * first one the best answer. Ids, not component names: many items wrap their component in a Stack (Dialog, Tabs, Button
 * row). search.selftest.mjs checks every id exists. No imports: `node search.selftest.mjs` loads it as is.
 */

export const SYNONYM_ROWS: ReadonlyArray<readonly [terms: readonly string[], ids: readonly string[]]> = [
  // Actions
  [["cta", "call to action", "submit", "nút chính"], ["button-primary", "button"]],
  [["nút", "nút bấm", "btn"], ["button", "button-primary", "icon-button", "button-row"]],
  [["buttons", "button group", "nhóm nút", "hàng nút"], ["button-row", "button"]],
  [["icon only", "nút biểu tượng"], ["icon-button"]],
  [["hyperlink", "anchor", "liên kết", "đường dẫn"], ["link"]],
  [["kebab", "overflow", "more actions", "context menu", "dropdown menu", "thêm"], ["menu"]],
  // Navigation
  [["tab", "tabbar", "thẻ tab"], ["tabs", "segmented"]],
  [["segmented control", "toggle group", "button group toggle", "chuyển chế độ"], ["segmented", "tabs"]],
  [["breadcrumb", "crumbs", "đường dẫn trang"], ["breadcrumbs"]],
  [["pager", "paging", "phân trang"], ["pagination"]],
  [["wizard", "steps", "progress steps", "các bước", "bước"], ["stepper"]],
  [["navbar", "nav bar", "app bar", "header bar", "thanh điều hướng", "thanh trên"], ["top-navigation", "page-header"]],
  [["tab bar", "bottom bar", "bottom nav", "thanh dưới"], ["bottom-navigation"]],
  [["side nav", "sidenav", "drawer nav", "thanh bên", "menu bên"], ["sidebar", "app-shell"]],
  [["điều hướng", "navigation", "nav"], ["top-navigation", "bottom-navigation", "sidebar", "breadcrumbs", "tabs"]],
  [["layout shell", "app frame", "khung ứng dụng"], ["app-shell"]],
  [["page title", "tiêu đề trang"], ["page-header"]],
  [["toolbar", "bulk actions", "thanh hành động"], ["action-bar"]],
  // Data display
  [["profile picture", "user photo", "ảnh đại diện", "đại diện"], ["avatar", "avatar-stack"]],
  [["avatars", "facepile", "nhóm ảnh đại diện"], ["avatar-stack"]],
  [["counter", "pill", "status", "label", "huy hiệu", "nhãn", "trạng thái"], ["badge", "tag-group"]],
  [["tags", "chips", "keywords", "thẻ"], ["tag-group", "chip-row", "card"]],
  [["app icon", "biểu tượng ứng dụng"], ["dock-icon"]],
  [["listview", "rows", "danh sách"], ["list", "list-box", "description-list"]],
  [["key value", "details", "properties", "thông tin chi tiết"], ["description-list"]],
  [["kpi", "stat", "statistic", "number", "chỉ số", "số liệu"], ["metric", "metric-card"]],
  [["tile", "panel", "khung", "thẻ nội dung"], ["card"]],
  [["progress bar", "loading bar", "percent", "tiến độ", "tiến trình"], ["progress", "stepper"]],
  [["glyph", "symbol", "biểu tượng"], ["icon", "icon-button"]],
  [["file type", "attachment", "tệp", "tệp đính kèm"], ["file-icon", "file-upload"]],
  [["country", "language", "quốc kỳ", "cờ", "quốc gia"], ["flag"]],
  [["stars", "review", "score", "đánh giá", "sao"], ["rating-display", "rating"]],
  [["grid data", "data grid", "spreadsheet", "bảng", "bảng dữ liệu"], ["table"]],
  [["picture", "photo", "img", "thumbnail", "ảnh", "hình", "hình ảnh"], ["image"]],
  // Charts
  [["graph", "plot", "analytics", "biểu đồ", "đồ thị"], ["chart-card", "line-chart", "bar-chart"]],
  [["trend", "time series", "đường"], ["line-chart", "chart-card"]],
  [["bar", "column chart", "stacked", "cột"], ["bar-chart"]],
  // Feedback
  [["callout", "note", "hint box", "ghi chú"], ["inline-message"]],
  [["alert", "banner", "warning", "cảnh báo"], ["alert-banner", "inline-message"]],
  [["notification", "snackbar", "toast", "thông báo"], ["alert-banner", "inline-message", "button"]],
  [["empty", "zero state", "no results", "no data", "trống", "không có dữ liệu"], ["empty-state"]],
  [["loading", "loader", "spinner", "placeholder", "shimmer", "đang tải"], ["skeleton", "progress"]],
  // Inputs
  [["input", "textbox", "text box", "textfield", "text input", "field", "ô nhập", "nhập", "ô văn bản"], ["input-field", "textarea-field", "number-field"]],
  [["textarea", "multiline", "comment box", "đoạn văn bản", "nhiều dòng"], ["textarea-field", "rich-text-field"]],
  [["dropdown", "select box", "picker", "combo", "chọn", "danh sách chọn"], ["select-field", "autocomplete-field", "menu"]],
  [["tickbox", "check box", "ô đánh dấu", "hộp kiểm"], ["checkbox"]],
  [["switch", "on off", "công tắc", "bật tắt", "nút gạt"], ["toggle"]],
  [["radio", "radio button", "options", "lựa chọn", "chọn một"], ["radio-group", "segmented"]],
  [["find", "search bar", "tìm", "tìm kiếm"], ["search", "autocomplete-field"]],
  [["filters", "filter", "lọc", "bộ lọc"], ["chip-row", "search"]],
  [["date", "calendar", "datepicker", "ngày", "lịch"], ["date-picker", "date-field"]],
  [["amount", "quantity", "stepper input", "số lượng", "số"], ["number-field"]],
  [["combobox", "typeahead", "suggestions", "gợi ý"], ["autocomplete-field"]],
  [["editor", "wysiwyg", "formatted text", "soạn thảo"], ["rich-text-field"]],
  [["range", "volume", "thanh trượt"], ["slider"]],
  [["nps", "survey", "khảo sát"], ["nps-scale"]],
  [["color", "colour", "swatch", "palette", "màu", "màu sắc"], ["color-selector"]],
  [["upload", "dropzone", "file input", "tải lên"], ["file-upload"]],
  [["form", "biểu mẫu"], ["input-field", "modal-form", "select-field"]],
  // Overlays
  [["modal", "popup", "pop up", "lightbox", "confirm", "hộp thoại", "cửa sổ", "xác nhận"], ["dialog", "modal-form"]],
  [["form dialog", "modal form", "hộp thoại nhập"], ["modal-form"]],
  [["drawer", "side sheet", "flyout", "ngăn kéo", "bảng bên"], ["side-panel", "bottom-sheet"]],
  [["action sheet", "sheet", "bottom drawer", "tấm dưới"], ["bottom-sheet"]],
  [["hover", "hint", "help", "chú thích", "gợi ý nhỏ"], ["tooltip"]],
  // Layout
  [["layout", "row", "column", "vstack", "hstack", "flex", "group", "bố cục", "hàng", "nhóm"], ["stack", "grid"]],
  [["columns", "masonry", "lưới"], ["grid"]],
  [["separator", "rule", "line", "hr", "đường kẻ", "phân cách"], ["divider"]],
  [["collapse", "expander", "disclosure", "faq", "thu gọn", "mở rộng"], ["accordion"]],
  // Text
  [["title", "header", "h1", "h2", "h3", "tiêu đề", "đề mục"], ["heading", "page-header"]],
  [["body", "copy", "text", "văn bản", "chữ", "đoạn"], ["paragraph", "caption", "heading"]],
  [["small text", "footnote", "chú thích nhỏ"], ["caption"]],
  // Chat
  [["messages", "conversation", "messenger", "trò chuyện", "tin nhắn"], ["chat-thread", "chat-composer", "ai-chat"]],
  [["assistant", "chatbot", "copilot", "trợ lý"], ["ai-chat"]],
];
