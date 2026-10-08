/**
 * Built-in UI text of Zen components — accessible names, control labels, status text — per language.
 * Components read it with useZenLabels(): the nearest <ZenProvider locale="vi"> picks the dictionary (by language
 * subtag, so "vi-VN" → vi), and <ZenProvider labels={{ … }}> overrides single entries (or adds a language).
 * A prop on the component (closeLabel, placeholder, aria-label…) always wins over both.
 */
export type ZenLabels = {
  // Overlays and dismissible messages
  close: string;
  closePanel: string;
  dismiss: string;
  // Removable items (Badge, Tag, Table tags, Uploader)
  remove: string;
  removeItem: (name: string) => string;
  // Search, pickers and lists
  search: string;
  searchOptions: string;
  clearSearch: string;
  filter: string;
  filterAll: string;
  /** How many filter values a Chip counter stands for, read after its label: "Filters, 2 applied". */
  appliedCount: (count: number | string) => string;
  noResults: string;
  noOptionMatches: (query: string) => string;
  create: string;
  createOption: (text: string) => string;
  /** PopoverManualAddNew's heading. */
  selectOrCreate: string;
  addItem: string;
  searchAndSelect: string;
  // Tables
  selectAllRows: string;
  selectRow: (row: number) => string;
  /** Count on a table's bulk-action bar ("3 selected"). */
  rowsSelected: (count: number) => string;
  /** Names a table's bulk-action bar (a toolbar). */
  selectedRowActions: (count: number) => string;
  clearSelection: string;
  /** Screen-reader hint on editable cells. */
  editableCellHint: string;
  /** Number editor's validation message. */
  enterNumber: string;
  /** Tags editor's placeholder. */
  addTag: string;
  /** Tags editor's suggestion list. */
  suggestions: string;
  /** A column's row-hover "Open" pill. */
  open: string;
  // Pagination and breadcrumbs
  pagination: string;
  previousPage: string;
  nextPage: string;
  page: (page: number) => string;
  resultsPerPage: string;
  results: (count: number) => string;
  /** Inline / Manually range: "1–50 of 1,234 results" (en dash, the language's thousands separator). */
  resultsRange: (first: number, last: number, total: number) => string;
  /** The unit after the Manually page-size number: "results". */
  resultsUnit: string;
  breadcrumb: string;
  showMore: (count: number) => string;
  // Dates
  cancel: string;
  apply: string;
  previousMonth: string;
  nextMonth: string;
  backToCalendar: string;
  month: string;
  year: string;
  day: (day: number | string) => string;
  /** The month/year button, after the month's name: "September 2026, choose month and year". */
  chooseMonthAndYear: (month: string) => string;
  /** The calendar's name: single calendar. */
  chooseDate: string;
  /** The calendar's name: dual calendar. */
  chooseDates: string;
  /** Date Picker Time-Picker: the start and end time fields, their placeholder, the day halves and "All day". */
  timeFrom: string;
  timeTo: string;
  timePlaceholder: string;
  timeAm: string;
  timePm: string;
  allDay: string;
  /** A time field that could not be read. */
  invalidTime: string;
  // Forms and fields
  fieldsNeedAttention: (count: number) => string;
  /** After an optional field's label or legend: "(Optional)". */
  optional: string;
  /** useFormState's submitError when onSubmit throws without a message. */
  somethingWentWrong: string;
  decrease: string;
  increase: string;
  moreInformation: string;
  formatting: string;
  /** A rich-text editor bar named after its field: "Notes formatting". */
  formattingOf: (label: string) => string;
  textStyle: string;
  insertLink: string;
  /** HeadingField's placeholder. */
  heading: string;
  richText: Record<"paragraph" | "heading1" | "heading2" | "heading3" | "undo" | "redo" | "bold" | "italic" | "underline" | "strikethrough" | "alignLeft" | "alignCenter" | "alignRight" | "justify" | "bulletedList" | "numberedList" | "decreaseIndent" | "increaseIndent" | "insertLink" | "insertImage" | "insertVideo" | "clearFormatting", string>;
  // Navigation and page frame
  mainNavigation: string;
  workspaceNavigation: string;
  navigation: string;
  openNavigation: string;
  /** The close button of the AppShell navigation drawer. */
  closeNavigation: string;
  skipToContent: string;
  expandSidebar: string;
  collapseSidebar: string;
  /** Accessible name of a top-bar action with unread items: "Notifications, 12 new" (no count: "Notifications, new"). */
  withUnread: (label: string, count?: number) => string;
  /** Accessible name of the AppShell account button: "Account: Ava Chen". */
  accountOf: (name: string) => string;
  workspace: string;
  switchWorkspace: string;
  subMenu: string;
  mainTabs: string;
  back: string;
  opensInNewTab: string;
  // Status
  online: string;
  progress: string;
  /** Stepper's screen-reader status after a failed step's title. */
  stepError: string;
  /** Stepper's screen-reader status after a passed step's title. */
  stepCompleted: string;
  rating: string;
  stars: (count: number) => string;
  /** RatingDisplay: "4.5 out of 5 stars"; `value` arrives formatted for the locale. */
  ratingValue: (value: string, max: number) => string;
  /** OpinionScale's emotion names. */
  opinion: Record<"veryDisappointed" | "disappointed" | "neutral" | "happy" | "veryHappy", string>;
  /** OpinionScale's name. */
  howDoYouFeel: string;
  /** NpsScale's name. */
  npsQuestion: string;
  /** NpsScale's end labels (low, high). */
  npsLow: string;
  npsHigh: string;
  range: string;
  openReport: string;
  /** A chart's screen-reader summary: the active point, "3 of 12". */
  chartPoint: (index: number, count: number) => string;
  /** A stack bar chart's screen-reader summary: "total 1.2K". */
  chartTotal: (value: string) => string;
  noData: string;
  colour: string;
  segmentedControl: string;
  // Files
  chooseFile: string;
  files: string;
  /** A single-file field's list. */
  file: string;
  /** The drop zone's text. */
  dropzoneText: string;
  replaceFile: (name: string) => string;
  retryFile: (name: string) => string;
  uploadingFile: (name: string) => string;
  cancelUpload: (name: string) => string;
  // Chat
  messages: string;
  /** The composer field's name. */
  message: string;
  composerPlaceholder: string;
  send: string;
  /** The composer's default quick action and leading actions. */
  sendLike: string;
  addAttachment: string;
  recordVoice: string;
  sendPhoto: string;
  addEmoji: string;
  retry: string;
  notDelivered: string;
  unread: string;
  messageActions: string;
  /** The hover toolbar's More (holdActions.more is the menu item). */
  moreActions: string;
  react: string;
  reactToMessage: string;
  moreReactions: string;
  /** The Reaction-Bar "+" emoji panel's name. */
  chooseReaction: string;
  reactions: string;
  reactionsSummary: (label: string) => string;
  showWhoReacted: (label: string) => string;
  peopleWhoReacted: string;
  filterReactions: string;
  allCount: (count: number) => string;
  /** Your own row in the reactions panel, and the one who replied in your replies. */
  you: string;
  tapToRemove: string;
  seenBy: (names: string) => string;
  cancelReply: string;
  emoji: string;
  searchEmoji: string;
  noEmojiMatches: (query: string) => string;
  backToQuickReactions: string;
  /** The 4th photo tile's name when more photos are hidden: "Beach, and 3 more". */
  andMorePhotos: (alt: string, count: number) => string;
  /** Call card titles (ChatCall). */
  audioCall: string;
  videoCall: string;
  missedAudioCall: string;
  missedVideoCall: string;
  /** Call card actions, in sentence case: "Call back" on a call and on one you missed (Figma's "Call Back"), "Call again" on one they missed. */
  callBack: string;
  callBackMissed: string;
  callAgain: string;
  /** Business call card action on a call they missed. */
  sendVoice: string;
  /** Conversation list previews of a call (ChatConversationItem). */
  previewMissedCall: string;
  previewAudioCall: string;
  previewOngoingCall: string;
  /** A reply's caption: "Ava replied to you". `who` is a name, `you` or `they`; `whom` a name, `youObject`, `yourself` or `themselves`. */
  repliedTo: (who: string, whom: string) => string;
  /** The composer's reply bar: "Replying to Ava" (or `yourself`). */
  replyingTo: (name: string) => string;
  they: string;
  youObject: string;
  yourself: string;
  themselves: string;
  /** Ends a reply quote's accessible name. */
  goToOriginal: string;
  /** Reply previews of the original message (chatReplySummary). */
  replyPhoto: string;
  replyPhotos: (count: number) => string;
  replyFile: string;
  replyCall: (type: "audio" | "video", missed: boolean) => string;
  replyVoice: (duration?: string) => string;
  replyUnavailable: string;
  holdActions: Record<"reply" | "forward" | "copy" | "pin" | "delete" | "report" | "callBack" | "more", string>;
  // AI chat
  /** AiChatBlock's greeting. */
  greeting: string;
  conversation: string;
  askAnything: string;
  thinking: string;
  stopGenerating: string;
  startVoiceMode: string;
  addFilesAndTools: string;
  dictate: string;
  assistant: string;
};

/** Range numbers with the language's thousands separator: en 1,284 · vi 1.284. */
const enNumber = new Intl.NumberFormat("en-US");
const viNumber = new Intl.NumberFormat("vi-VN");

const en: ZenLabels = {
  close: "Close",
  closePanel: "Close panel",
  dismiss: "Dismiss",
  remove: "Remove",
  removeItem: (name) => `Remove ${name}`,
  search: "Search",
  searchOptions: "Search options",
  clearSearch: "Clear search",
  filter: "Filter",
  filterAll: "All",
  appliedCount: (count) => `${count} applied`,
  noResults: "No results",
  noOptionMatches: (query) => `No option matches “${query}”`,
  create: "Create",
  createOption: (text) => `Create “${text}”`,
  selectOrCreate: "Select an option or create one",
  addItem: "Add Item",
  searchAndSelect: "Search and select",
  selectAllRows: "Select all rows",
  selectRow: (row) => `Select row ${row}`,
  rowsSelected: (count) => `${enNumber.format(count)} selected`,
  selectedRowActions: (count) => `Actions for ${enNumber.format(count)} selected ${count === 1 ? "row" : "rows"}`,
  clearSelection: "Clear selection",
  editableCellHint: "Editable cell. Press Enter or start typing to edit, Escape to cancel, arrow keys to move.",
  enterNumber: "Enter a number",
  addTag: "Add tag",
  suggestions: "Suggestions",
  open: "Open",
  pagination: "Pagination",
  previousPage: "Previous page",
  nextPage: "Next page",
  page: (page) => `Page ${page}`,
  resultsPerPage: "Results per page",
  results: (count) => `${count} ${count === 1 ? "result" : "results"}`,
  resultsRange: (first, last, total) => `${enNumber.format(first)}–${enNumber.format(last)} of ${enNumber.format(total)} ${total === 1 ? "result" : "results"}`,
  resultsUnit: "results",
  breadcrumb: "Breadcrumb",
  showMore: (count) => `Show ${count} more`,
  cancel: "Cancel",
  apply: "Submit",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  backToCalendar: "Back to calendar",
  month: "Month",
  year: "Year",
  day: (day) => `Day ${day}`,
  chooseMonthAndYear: (month) => `${month}, choose month and year`,
  chooseDate: "Choose date",
  chooseDates: "Choose dates",
  timeFrom: "From",
  timeTo: "To",
  timePlaceholder: "hh:mm",
  timeAm: "AM",
  timePm: "PM",
  allDay: "All day",
  invalidTime: "Enter a time like 9:30",
  fieldsNeedAttention: (count) => `${count} ${count === 1 ? "field needs" : "fields need"} attention`,
  optional: "(Optional)",
  somethingWentWrong: "Something went wrong. Try again.",
  decrease: "Decrease",
  increase: "Increase",
  moreInformation: "More information",
  formatting: "Formatting",
  formattingOf: (label) => `${label} formatting`,
  textStyle: "Text style",
  insertLink: "Insert link",
  heading: "Heading",
  richText: {
    paragraph: "Paragraph", heading1: "Heading 1", heading2: "Heading 2", heading3: "Heading 3", undo: "Undo", redo: "Redo",
    bold: "Bold", italic: "Italic", underline: "Underline", strikethrough: "Strikethrough", alignLeft: "Align left",
    alignCenter: "Align center", alignRight: "Align right", justify: "Justify", bulletedList: "Bulleted list",
    numberedList: "Numbered list", decreaseIndent: "Decrease indent", increaseIndent: "Increase indent",
    insertLink: "Insert link", insertImage: "Insert image", insertVideo: "Insert video", clearFormatting: "Clear formatting",
  },
  mainNavigation: "Main navigation",
  workspaceNavigation: "Workspace navigation",
  navigation: "Navigation",
  openNavigation: "Open navigation",
  closeNavigation: "Close navigation",
  skipToContent: "Skip to content",
  expandSidebar: "Expand sidebar",
  collapseSidebar: "Collapse sidebar",
  withUnread: (label, count) => (count ? `${label}, ${count} new` : `${label}, new`),
  accountOf: (name) => `Account: ${name}`,
  workspace: "Workspace",
  switchWorkspace: "Switch workspace",
  subMenu: "Sub menu",
  mainTabs: "Main",
  back: "Back",
  opensInNewTab: "(opens in a new tab)",
  online: "Online",
  progress: "Progress",
  stepError: "(error)",
  stepCompleted: "(completed)",
  rating: "Rating",
  stars: (count) => `${count} ${count === 1 ? "star" : "stars"}`,
  ratingValue: (value, max) => `${value} out of ${max} stars`,
  opinion: { veryDisappointed: "Very Disappointed", disappointed: "Disappointed", neutral: "Neutral", happy: "Happy", veryHappy: "Very Happy" },
  howDoYouFeel: "How do you feel?",
  npsQuestion: "How likely are you to recommend us?",
  npsLow: "Very disappointed",
  npsHigh: "Very happy",
  range: "Range",
  openReport: "Open report",
  chartPoint: (index, count) => `${index} of ${count}`,
  chartTotal: (value) => `total ${value}`,
  noData: "No data",
  colour: "Colour",
  segmentedControl: "Segmented control",
  chooseFile: "Choose File",
  files: "Files",
  file: "File",
  dropzoneText: "Drag & Drop or Choose file to upload",
  replaceFile: (name) => `Replace ${name}`,
  retryFile: (name) => `Retry ${name}`,
  uploadingFile: (name) => `Uploading ${name}`,
  cancelUpload: (name) => `Cancel upload of ${name}`,
  messages: "Messages",
  message: "Message",
  composerPlaceholder: "Aa",
  send: "Send",
  sendLike: "Send a like",
  addAttachment: "Add attachment",
  recordVoice: "Record voice",
  sendPhoto: "Send a photo",
  addEmoji: "Add emoji",
  retry: "Retry",
  notDelivered: "Not delivered",
  unread: "Unread",
  messageActions: "Message actions",
  moreActions: "More actions",
  react: "React",
  reactToMessage: "React to message",
  moreReactions: "More reactions",
  chooseReaction: "Choose a reaction",
  reactions: "Reactions",
  reactionsSummary: (label) => `Reactions: ${label}`,
  showWhoReacted: (label) => `Reactions: ${label}. Show who reacted`,
  peopleWhoReacted: "People who reacted",
  filterReactions: "Filter reactions",
  allCount: (count) => `All ${count}`,
  you: "You",
  tapToRemove: "Tap to remove",
  seenBy: (names) => `Seen by ${names}`,
  cancelReply: "Cancel reply",
  emoji: "Emoji",
  searchEmoji: "Search emoji",
  noEmojiMatches: (query) => `No emoji matches “${query}”`,
  backToQuickReactions: "Back to quick reactions",
  andMorePhotos: (alt, count) => `${alt}, and ${count} more`,
  audioCall: "Audio call",
  videoCall: "Video call",
  missedAudioCall: "Missed audio call",
  missedVideoCall: "Missed video call",
  callBack: "Call back",
  callBackMissed: "Call back",
  callAgain: "Call again",
  sendVoice: "Send voice message",
  previewMissedCall: "Missed call",
  previewAudioCall: "Audio call",
  previewOngoingCall: "Ongoing call…",
  repliedTo: (who, whom) => `${who} replied to ${whom}`,
  replyingTo: (name) => `Replying to ${name}`,
  they: "They",
  youObject: "you",
  yourself: "yourself",
  themselves: "themselves",
  goToOriginal: "Go to the original message",
  replyPhoto: "Photo",
  replyPhotos: (count) => `${count} photos`,
  replyFile: "File",
  replyCall: (type, missed) => `${missed ? "Missed " : ""}${type} call`,
  replyVoice: (duration) => `Voice message${duration ? ` · ${duration}` : ""}`,
  replyUnavailable: "Message unavailable",
  holdActions: { reply: "Reply", forward: "Forward", copy: "Copy", pin: "Pin", delete: "Delete", report: "Report", callBack: "Call back", more: "More" },
  greeting: "How can I help you today?",
  conversation: "Conversation",
  askAnything: "Ask me anything",
  thinking: "Thinking",
  stopGenerating: "Stop generating",
  startVoiceMode: "Start voice mode",
  addFilesAndTools: "Add files and tools",
  dictate: "Dictate",
  assistant: "Assistant",
};

const vi: ZenLabels = {
  close: "Đóng",
  closePanel: "Đóng bảng",
  dismiss: "Bỏ qua",
  remove: "Xoá",
  removeItem: (name) => `Xoá ${name}`,
  search: "Tìm kiếm",
  searchOptions: "Tìm lựa chọn",
  clearSearch: "Xoá tìm kiếm",
  filter: "Lọc",
  filterAll: "Tất cả",
  appliedCount: (count) => `${count} mục đã áp dụng`,
  noResults: "Không có kết quả",
  noOptionMatches: (query) => `Không có lựa chọn nào khớp “${query}”`,
  create: "Tạo",
  createOption: (text) => `Tạo “${text}”`,
  selectOrCreate: "Chọn một lựa chọn hoặc tạo mới",
  addItem: "Thêm mục",
  searchAndSelect: "Tìm và chọn",
  selectAllRows: "Chọn tất cả các hàng",
  selectRow: (row) => `Chọn hàng ${row}`,
  rowsSelected: (count) => `Đã chọn ${viNumber.format(count)}`,
  selectedRowActions: (count) => `Thao tác cho ${viNumber.format(count)} hàng đã chọn`,
  clearSelection: "Bỏ chọn",
  editableCellHint: "Ô có thể chỉnh sửa. Nhấn Enter hoặc bắt đầu gõ để sửa, Escape để huỷ, phím mũi tên để di chuyển.",
  enterNumber: "Nhập một số",
  addTag: "Thêm thẻ",
  suggestions: "Gợi ý",
  open: "Mở",
  pagination: "Phân trang",
  previousPage: "Trang trước",
  nextPage: "Trang sau",
  page: (page) => `Trang ${page}`,
  resultsPerPage: "Số kết quả mỗi trang",
  results: (count) => `${count} kết quả`,
  resultsRange: (first, last, total) => `${viNumber.format(first)}–${viNumber.format(last)} trên ${viNumber.format(total)} kết quả`,
  resultsUnit: "kết quả",
  breadcrumb: "Đường dẫn",
  showMore: (count) => `Hiện thêm ${count}`,
  cancel: "Huỷ",
  apply: "Áp dụng",
  previousMonth: "Tháng trước",
  nextMonth: "Tháng sau",
  backToCalendar: "Quay lại lịch",
  month: "Tháng",
  year: "Năm",
  day: (day) => `Ngày ${day}`,
  chooseMonthAndYear: (month) => `${month}, chọn tháng và năm`,
  chooseDate: "Chọn ngày",
  chooseDates: "Chọn các ngày",
  timeFrom: "Từ",
  timeTo: "Đến",
  timePlaceholder: "hh:mm",
  timeAm: "SA",
  timePm: "CH",
  allDay: "Cả ngày",
  invalidTime: "Nhập giờ dạng 9:30",
  fieldsNeedAttention: (count) => `${count} trường cần xem lại`,
  optional: "(Không bắt buộc)",
  somethingWentWrong: "Đã có lỗi xảy ra. Hãy thử lại.",
  decrease: "Giảm",
  increase: "Tăng",
  moreInformation: "Thêm thông tin",
  formatting: "Định dạng",
  formattingOf: (label) => `Định dạng ${label}`,
  textStyle: "Kiểu chữ",
  insertLink: "Chèn liên kết",
  heading: "Tiêu đề",
  richText: {
    paragraph: "Đoạn văn", heading1: "Tiêu đề 1", heading2: "Tiêu đề 2", heading3: "Tiêu đề 3", undo: "Hoàn tác", redo: "Làm lại",
    bold: "In đậm", italic: "In nghiêng", underline: "Gạch chân", strikethrough: "Gạch ngang", alignLeft: "Căn trái",
    alignCenter: "Căn giữa", alignRight: "Căn phải", justify: "Căn đều", bulletedList: "Danh sách dấu đầu dòng",
    numberedList: "Danh sách đánh số", decreaseIndent: "Giảm thụt lề", increaseIndent: "Tăng thụt lề",
    insertLink: "Chèn liên kết", insertImage: "Chèn ảnh", insertVideo: "Chèn video", clearFormatting: "Xoá định dạng",
  },
  mainNavigation: "Điều hướng chính",
  workspaceNavigation: "Điều hướng không gian làm việc",
  navigation: "Điều hướng",
  openNavigation: "Mở điều hướng",
  closeNavigation: "Đóng điều hướng",
  skipToContent: "Bỏ qua, tới nội dung",
  expandSidebar: "Mở rộng thanh bên",
  collapseSidebar: "Thu gọn thanh bên",
  withUnread: (label, count) => (count ? `${label}, ${count} mục mới` : `${label}, có mục mới`),
  accountOf: (name) => `Tài khoản: ${name}`,
  workspace: "Không gian làm việc",
  switchWorkspace: "Đổi không gian làm việc",
  subMenu: "Menu con",
  mainTabs: "Chính",
  back: "Quay lại",
  opensInNewTab: "(mở trong thẻ mới)",
  online: "Đang hoạt động",
  progress: "Tiến độ",
  stepError: "(lỗi)",
  stepCompleted: "(đã hoàn thành)",
  rating: "Đánh giá",
  stars: (count) => `${count} sao`,
  ratingValue: (value, max) => `${value} trên ${max} sao`,
  opinion: { veryDisappointed: "Rất thất vọng", disappointed: "Thất vọng", neutral: "Bình thường", happy: "Hài lòng", veryHappy: "Rất hài lòng" },
  howDoYouFeel: "Bạn cảm thấy thế nào?",
  npsQuestion: "Khả năng bạn giới thiệu chúng tôi là bao nhiêu?",
  npsLow: "Rất thất vọng",
  npsHigh: "Rất hài lòng",
  range: "Khoảng thời gian",
  openReport: "Mở báo cáo",
  chartPoint: (index, count) => `${index} trên ${count}`,
  chartTotal: (value) => `tổng ${value}`,
  noData: "Không có dữ liệu",
  colour: "Màu",
  segmentedControl: "Bộ chọn phân đoạn",
  chooseFile: "Chọn tệp",
  files: "Tệp",
  file: "Tệp",
  dropzoneText: "Kéo thả hoặc chọn tệp để tải lên",
  replaceFile: (name) => `Thay ${name}`,
  retryFile: (name) => `Thử lại ${name}`,
  uploadingFile: (name) => `Đang tải lên ${name}`,
  cancelUpload: (name) => `Huỷ tải lên ${name}`,
  messages: "Tin nhắn",
  message: "Tin nhắn",
  composerPlaceholder: "Aa",
  send: "Gửi",
  sendLike: "Gửi lượt thích",
  addAttachment: "Thêm tệp đính kèm",
  recordVoice: "Ghi âm",
  sendPhoto: "Gửi ảnh",
  addEmoji: "Thêm biểu tượng cảm xúc",
  retry: "Thử lại",
  notDelivered: "Không gửi được",
  unread: "Chưa đọc",
  messageActions: "Thao tác với tin nhắn",
  moreActions: "Thao tác khác",
  react: "Bày tỏ cảm xúc",
  reactToMessage: "Bày tỏ cảm xúc với tin nhắn",
  moreReactions: "Thêm cảm xúc",
  chooseReaction: "Chọn cảm xúc",
  reactions: "Cảm xúc",
  reactionsSummary: (label) => `Cảm xúc: ${label}`,
  showWhoReacted: (label) => `Cảm xúc: ${label}. Xem ai đã bày tỏ`,
  peopleWhoReacted: "Những người đã bày tỏ",
  filterReactions: "Lọc cảm xúc",
  allCount: (count) => `Tất cả ${count}`,
  you: "Bạn",
  tapToRemove: "Nhấn để gỡ",
  seenBy: (names) => `${names} đã xem`,
  cancelReply: "Huỷ trả lời",
  emoji: "Biểu tượng cảm xúc",
  searchEmoji: "Tìm biểu tượng cảm xúc",
  noEmojiMatches: (query) => `Không có biểu tượng cảm xúc nào khớp “${query}”`,
  backToQuickReactions: "Quay lại cảm xúc nhanh",
  andMorePhotos: (alt, count) => `${alt} và ${count} ảnh khác`,
  audioCall: "Cuộc gọi thoại",
  videoCall: "Cuộc gọi video",
  missedAudioCall: "Cuộc gọi thoại nhỡ",
  missedVideoCall: "Cuộc gọi video nhỡ",
  callBack: "Gọi lại",
  callBackMissed: "Gọi lại",
  callAgain: "Gọi lại",
  sendVoice: "Gửi tin nhắn thoại",
  previewMissedCall: "Cuộc gọi nhỡ",
  previewAudioCall: "Cuộc gọi thoại",
  previewOngoingCall: "Đang trong cuộc gọi…",
  repliedTo: (who, whom) => `${who} đã trả lời ${whom}`,
  replyingTo: (name) => `Đang trả lời ${name}`,
  they: "Họ",
  youObject: "bạn",
  yourself: "chính mình",
  themselves: "chính mình",
  goToOriginal: "Đi tới tin nhắn gốc",
  replyPhoto: "Ảnh",
  replyPhotos: (count) => `${count} ảnh`,
  replyFile: "Tệp",
  replyCall: (type, missed) => `Cuộc gọi ${type === "video" ? "video" : "thoại"}${missed ? " nhỡ" : ""}`,
  replyVoice: (duration) => `Tin nhắn thoại${duration ? ` · ${duration}` : ""}`,
  replyUnavailable: "Tin nhắn không khả dụng",
  holdActions: { reply: "Trả lời", forward: "Chuyển tiếp", copy: "Sao chép", pin: "Ghim", delete: "Xoá", report: "Báo cáo", callBack: "Gọi lại", more: "Thêm" },
  greeting: "Hôm nay tôi có thể giúp gì cho bạn?",
  conversation: "Cuộc trò chuyện",
  askAnything: "Hỏi bất cứ điều gì",
  thinking: "Đang suy nghĩ",
  stopGenerating: "Dừng tạo",
  startVoiceMode: "Bật chế độ giọng nói",
  addFilesAndTools: "Thêm tệp và công cụ",
  dictate: "Đọc chính tả",
  assistant: "Trợ lý",
};

/** Built-in dictionaries by language subtag. */
export const zenLabels: Record<string, ZenLabels> = { en, vi };
export type ZenLabelOverrides = Partial<Omit<ZenLabels, "richText" | "holdActions" | "opinion">> & {
  richText?: Partial<ZenLabels["richText"]>;
  holdActions?: Partial<ZenLabels["holdActions"]>;
  opinion?: Partial<ZenLabels["opinion"]>;
};

/** Dictionary for a BCP 47 locale ("vi-VN" → vi), English when unknown, with overrides merged in. */
export function resolveZenLabels(locale?: string, overrides?: ZenLabelOverrides): ZenLabels {
  const language = (locale ?? "en").toLowerCase().split(/[-_]/)[0];
  const base = zenLabels[language] ?? en;
  if (!overrides) return base;
  return { ...base, ...overrides, richText: { ...base.richText, ...overrides.richText }, holdActions: { ...base.holdActions, ...overrides.holdActions }, opinion: { ...base.opinion, ...overrides.opinion } } as ZenLabels;
}
