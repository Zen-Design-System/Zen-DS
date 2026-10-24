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
  /** Names a row's action button in a Table Actions-Cell ("Edit, row 3"); the visible tooltip is the action alone. */
  rowAction: (action: string, row: number) => string;
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
  /** DatePickerSheet: confirms the picked date or range (Figma Date-Picker/Mobile "OK"). */
  ok: string;
  /** A phone's multi-select sheet (Chip popoverMultiple): picks apply at once, Done closes it. */
  done: string;
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
  /** DatePickerSheet `header="selection"`: the heading while no date (single) or no dates (range) are picked, the edit
   *  action beside the picked date, and the action that empties a picked range. */
  noDateSelected: string;
  noDatesSelected: string;
  editDate: string;
  clearDates: string;
  /** Date Picker Time-Picker: the start and end time fields, their placeholder, the day halves and "All day". */
  timeFrom: string;
  timeTo: string;
  timePlaceholder: string;
  timeAm: string;
  timePm: string;
  allDay: string;
  /** A time field that could not be read. */
  invalidTime: string;
  // Calendar (Calendar/Toolbar, Month, Time-Grid, Agenda, Week-Strip)
  /** The Toolbar's Today button and the agenda's "Today · Wed, Sep 30" kicker. */
  today: string;
  /** The agenda's "Tomorrow · Thu, Oct 1" kicker. */
  tomorrow: string;
  previousWeek: string;
  nextWeek: string;
  previousDay: string;
  nextDay: string;
  /** A view of the Toolbar's switch: Month, Week, Day, 3 days, Agenda. */
  calendarView: (view: "month" | "week" | "day" | "3-day" | "agenda") => string;
  /** Names the Toolbar's view switch. */
  calendarViews: string;
  /** A month cell's "+2 more" (the events that do not fit). */
  moreEvents: (count: number) => string;
  /** The accessible name of "+2 more": "Show 2 more events". */
  showMoreEvents: (count: number) => string;
  /** After a day's date in its accessible name: "Wednesday, September 30, 2026, 3 events". */
  eventCount: (count: number) => string;
  /** The agenda with no events in its range: title and caption. */
  noEvents: string;
  noEventsDescription: string;
  // Schedule (Resource-Grid, Itinerary, Slot-Picker, Day-Planner)
  /** The running stop's badge (Itinerary) — "Now". */
  now: string;
  /** A card's ⋮ menu: "Actions for Exploration phase". */
  actionsFor: (name: string) => string;
  /** A stop's length: "90 min". */
  minutes: (count: number) => string;
  /** The Slot-Picker's groups on a phone. */
  morning: string;
  afternoon: string;
  evening: string;
  /** The Resource-Grid's resource column: "Team & rooms" (desktop), "Team" (phone). */
  teamAndRooms: string;
  team: string;
  /** Names the Slot-Picker's radio group. */
  availableTimes: string;
  /** After a taken slot's time: "unavailable". */
  unavailable: string;
  /** A day without slots. */
  noTimes: string;
  /** The Day-Planner's month selector. */
  chooseMonth: string;
  // Timeline (Activity, Gantt)
  /** The activity feed's "Yesterday" kicker. */
  yesterday: string;
  /** The Gantt's task column header and the plan's name. */
  tasks: string;
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
  /** Avatar / AvatarStatus words for Figma .Primitives/Avatar/Status Disabled, Pending and Inactive (Active is `online`). */
  statusDisabled: string;
  statusPending: string;
  statusInactive: string;
  progress: string;
  /** Stepper's screen-reader status after a failed step's title. */
  stepError: string;
  /** Stepper's screen-reader status after a passed step's title. */
  stepCompleted: string;
  /** BadgeStatus's default labels, one per workflow step (Figma Badge-Status). */
  statusToDo: string;
  statusInProgress: string;
  statusInReview: string;
  statusDone: string;
  statusBlocked: string;
  statusCancelled: string;
  /** BadgeStatus: the ring's value read after the label when `progress` is set ("60% complete"). */
  statusPercent: (percent: number) => string;
  /** PropertyField: an empty value (Figma State=Default). */
  propertyEmpty: string;
  /** PropertyField: the + after the label that adds a value to its People or Tags ("Add Labels"). */
  propertyAdd: (label: string) => string;
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
  /** A bar against its goal: "$320 of $400". */
  chartOfTarget: (value: string, target: string) => string;
  /** A forecast bar's Tooltip suffix. */
  chartProjected: string;
  /** A heatmap's summary before a cell is picked: "Highest: Thu, 3 pm: 42". */
  chartHighest: string;
  /** A heatmap scale's ends. */
  chartLess: string;
  chartMore: string;
  /** The average line's tag ("Avg $95.4K") and its screen-reader form ("average $95.4K"). */
  chartAverage: (value: string) => string;
  chartAverageLong: (value: string) => string;
  /** A goal chart's legend names (BulletChart; GaugeChart's target): the measured value and its goal. */
  chartActual: string;
  chartTarget: string;
  /** A funnel stage's share of the first stage, in its summary: "65% of Leads". */
  chartShareOf: (share: string, of: string) => string;
  /** A MetricCard sparkline's or spark bars' accessible name: "Trend over 12 periods: from 61 to 106, low 61, high 106". */
  metricSeries: (count: number, first: string, last: string, low: string, high: string) => string;
  /** A Goal-Progress MetricCard's bar label: "of $135,000 goal". */
  metricGoalOf: (target: string) => string;
  /** The caption under a donut's total. */
  total: string;
  noData: string;
  colour: string;
  /** ColorPicker's dialog name and ColorField's popup: "Choose a colour". */
  chooseColour: string;
  /** ColorPicker's saturation × brightness area (a 2D slider). */
  saturationBrightness: string;
  /** Its value, read on every move: "Saturation 87%, brightness 92%". */
  saturationBrightnessValue: (saturation: number, brightness: number) => string;
  /** ColorPicker's hue slider. */
  hue: string;
  /** ColorPicker's Format select (Hex · RGB · HSL · HSB). */
  colourFormat: string;
  /** The heading of ColorPicker's saved colours. */
  savedColours: string;
  /** Channel names of ColorPicker's value fields (the fields show one letter). */
  hexValue: string;
  red: string;
  green: string;
  blue: string;
  saturation: string;
  lightness: string;
  brightness: string;
  /** CurvePreview's name for assistive technology: "Motion curve: Spring". */
  motionCurve: (curve: string) => string;
  /** CurvePreview's curve types. */
  curveSpring: string;
  curveBounce: string;
  curveEaseOut: string;
  curveEaseInOut: string;
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
  listening: string;
  stopDictation: string;
  voiceNewRecording: string;
  voiceReady: string;
  voiceRecording: string;
  voicePaused: string;
  voiceRecord: string;
  voicePause: string;
  voiceResume: string;
  voiceDiscard: string;
  voiceFinish: string;
  voiceReadyGuidance: string;
  voiceRecordingGuidance: string;
  voicePausedGuidance: string;
  voiceAssistant: string;
  voiceListening: string;
  voiceResponding: string;
  /** AiVoiceConversation Thinking (between your last word and its first spoken word): the badge, heading and line. */
  voiceThinking: string;
  voiceThinkingHeading: string;
  voiceThinkingGuidance: string;
  /** Who the transcript is from while it thinks: what you said, finished. */
  voiceYouSaid: string;
  voiceReadyHeading: string;
  voiceListeningHeading: string;
  voiceRespondingHeading: string;
  voiceReadyConversationGuidance: string;
  voiceListeningGuidance: string;
  voiceRespondingGuidance: string;
  voiceTrySaying: string;
  voiceYouLive: string;
  voiceAssistantSpoken: string;
  voiceStartTalking: string;
  voiceDoneSpeaking: string;
  voiceInterrupt: string;
  voiceMute: string;
  voiceEnd: string;
  voiceMicOffNote: string;
  voiceConnectedNote: string;
  /** Listening with the microphone muted: the guidance line and the note. */
  voiceMutedGuidance: string;
  voiceMutedNote: string;
  playVoiceMessage: string;
  pauseVoiceMessage: string;
  voiceReadyToPlay: string;
  voicePlaying: string;
  playbackSpeed: (speed: string) => string;
  /** ChatVoice with onSeek: the waveform's slider name and where playback is ("0:12 of 0:32"). */
  voicePosition: string;
  voicePositionValue: (elapsed: string, duration: string) => string;
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
  rowAction: (action, row) => `${action}, row ${row}`,
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
  ok: "OK",
  done: "Done",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  backToCalendar: "Back to calendar",
  month: "Month",
  year: "Year",
  day: (day) => `Day ${day}`,
  chooseMonthAndYear: (month) => `${month}, choose month and year`,
  chooseDate: "Choose date",
  chooseDates: "Choose dates",
  noDateSelected: "No date selected",
  noDatesSelected: "No dates selected",
  editDate: "Edit date",
  clearDates: "Clear dates",
  timeFrom: "From",
  timeTo: "To",
  timePlaceholder: "hh:mm",
  timeAm: "AM",
  timePm: "PM",
  allDay: "All day",
  invalidTime: "Enter a time like 9:30",
  today: "Today",
  tomorrow: "Tomorrow",
  previousWeek: "Previous week",
  nextWeek: "Next week",
  previousDay: "Previous day",
  nextDay: "Next day",
  calendarView: (view) => ({ month: "Month", week: "Week", day: "Day", "3-day": "3 days", agenda: "Agenda" })[view],
  calendarViews: "Calendar view",
  moreEvents: (count) => `+${count} more`,
  showMoreEvents: (count) => `Show ${count} more ${count === 1 ? "event" : "events"}`,
  eventCount: (count) => `${count} ${count === 1 ? "event" : "events"}`,
  noEvents: "No events",
  noEventsDescription: "Nothing is planned for these days.",
  now: "Now",
  actionsFor: (name) => (name ? `Actions for ${name}` : "Actions"),
  minutes: (count) => `${count} min`,
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  teamAndRooms: "Team & rooms",
  team: "Team",
  availableTimes: "Available times",
  unavailable: "unavailable",
  noTimes: "No times left on this day",
  chooseMonth: "Choose month",
  yesterday: "Yesterday",
  tasks: "Tasks",
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
  statusDisabled: "Disabled",
  statusPending: "Pending",
  statusInactive: "Inactive",
  progress: "Progress",
  stepError: "(error)",
  stepCompleted: "(completed)",
  statusToDo: "To Do",
  statusInProgress: "In Progress",
  statusInReview: "In Review",
  statusDone: "Done",
  statusBlocked: "Blocked",
  statusCancelled: "Cancelled",
  statusPercent: (percent) => `${percent}% complete`,
  propertyEmpty: "Empty",
  propertyAdd: (label) => `Add ${label}`,
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
  chartOfTarget: (value, target) => `${value} of ${target}`,
  chartProjected: "projected",
  chartHighest: "Highest",
  chartLess: "Less",
  chartMore: "More",
  chartAverage: (value) => `Avg ${value}`,
  chartAverageLong: (value) => `average ${value}`,
  chartActual: "Actual",
  chartTarget: "Target",
  chartShareOf: (share, of) => `${share} of ${of}`,
  metricSeries: (count, first, last, low, high) => `Trend over ${count} periods: from ${first} to ${last}, low ${low}, high ${high}`,
  metricGoalOf: (target) => `of ${target} goal`,
  total: "Total",
  noData: "No data",
  colour: "Colour",
  chooseColour: "Choose a colour",
  saturationBrightness: "Saturation and brightness",
  saturationBrightnessValue: (saturation, brightness) => `Saturation ${saturation}%, brightness ${brightness}%`,
  hue: "Hue",
  colourFormat: "Format",
  savedColours: "Saved",
  hexValue: "Hex value",
  red: "Red",
  green: "Green",
  blue: "Blue",
  saturation: "Saturation",
  lightness: "Lightness",
  brightness: "Brightness",
  motionCurve: (curve) => `Motion curve: ${curve}`,
  curveSpring: "Spring",
  curveBounce: "Bounce",
  curveEaseOut: "Ease out",
  curveEaseInOut: "Ease in and out",
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
  listening: "Listening…",
  stopDictation: "Stop dictation",
  voiceNewRecording: "New recording",
  voiceReady: "Ready",
  voiceRecording: "Recording",
  voicePaused: "Paused",
  voiceRecord: "Record",
  voicePause: "Pause",
  voiceResume: "Resume",
  voiceDiscard: "Discard",
  voiceFinish: "Finish",
  voiceReadyGuidance: "Ready when you are. Tap Record to begin.",
  voiceRecordingGuidance: "Capturing audio from your microphone.",
  voicePausedGuidance: "Recording paused. Resume or finish your take.",
  voiceAssistant: "Zen voice",
  voiceListening: "Listening",
  voiceResponding: "Responding",
  voiceThinking: "Thinking",
  voiceThinkingHeading: "Thinking it through",
  voiceThinkingGuidance: "Working on an answer. You can interrupt.",
  voiceYouSaid: "You · Said",
  voiceReadyHeading: "Let’s talk",
  voiceListeningHeading: "I’m listening",
  voiceRespondingHeading: "Here’s what I found",
  voiceReadyConversationGuidance: "Ask a question. Think out loud. Start anywhere.",
  voiceListeningGuidance: "Speak naturally. I’ll follow your lead.",
  voiceRespondingGuidance: "You can interrupt me at any time.",
  voiceTrySaying: "Try saying",
  voiceYouLive: "You · Live transcript",
  voiceAssistantSpoken: "Zen · Spoken response",
  voiceStartTalking: "Start talking",
  voiceDoneSpeaking: "Done speaking",
  voiceInterrupt: "Interrupt",
  voiceMute: "Mute",
  voiceEnd: "End",
  voiceMicOffNote: "Your microphone stays off until you start.",
  voiceConnectedNote: "Voice conversation · Microphone connected",
  voiceMutedGuidance: "Your microphone is muted. Unmute to keep talking.",
  voiceMutedNote: "Voice conversation · Microphone muted",
  playVoiceMessage: "Play voice message",
  pauseVoiceMessage: "Pause voice message",
  voiceReadyToPlay: "Ready to play",
  voicePlaying: "Playing",
  playbackSpeed: (speed) => `Playback speed ${speed}`,
  voicePosition: "Playback position",
  voicePositionValue: (elapsed, duration) => `${elapsed} of ${duration}`,
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
  rowAction: (action, row) => `${action}, hàng ${row}`,
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
  ok: "Xong",
  done: "Xong",
  previousMonth: "Tháng trước",
  nextMonth: "Tháng sau",
  backToCalendar: "Quay lại lịch",
  month: "Tháng",
  year: "Năm",
  day: (day) => `Ngày ${day}`,
  chooseMonthAndYear: (month) => `${month}, chọn tháng và năm`,
  chooseDate: "Chọn ngày",
  chooseDates: "Chọn các ngày",
  noDateSelected: "Chưa chọn ngày",
  noDatesSelected: "Chưa chọn ngày nào",
  editDate: "Sửa ngày",
  clearDates: "Xoá ngày đã chọn",
  timeFrom: "Từ",
  timeTo: "Đến",
  timePlaceholder: "hh:mm",
  timeAm: "SA",
  timePm: "CH",
  allDay: "Cả ngày",
  invalidTime: "Nhập giờ dạng 9:30",
  today: "Hôm nay",
  tomorrow: "Ngày mai",
  previousWeek: "Tuần trước",
  nextWeek: "Tuần sau",
  previousDay: "Ngày trước",
  nextDay: "Ngày sau",
  calendarView: (view) => ({ month: "Tháng", week: "Tuần", day: "Ngày", "3-day": "3 ngày", agenda: "Lịch trình" })[view],
  calendarViews: "Chế độ xem lịch",
  moreEvents: (count) => `+${count} nữa`,
  showMoreEvents: (count) => `Xem thêm ${count} sự kiện`,
  eventCount: (count) => `${count} sự kiện`,
  noEvents: "Không có sự kiện",
  noEventsDescription: "Chưa có lịch nào trong những ngày này.",
  now: "Đang diễn ra",
  actionsFor: (name) => (name ? `Thao tác cho ${name}` : "Thao tác"),
  minutes: (count) => `${count} phút`,
  morning: "Buổi sáng",
  afternoon: "Buổi chiều",
  evening: "Buổi tối",
  teamAndRooms: "Nhóm & phòng",
  team: "Nhóm",
  availableTimes: "Giờ còn trống",
  unavailable: "đã kín",
  noTimes: "Ngày này đã hết giờ trống",
  chooseMonth: "Chọn tháng",
  yesterday: "Hôm qua",
  tasks: "Công việc",
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
  statusDisabled: "Đã tắt",
  statusPending: "Đang chờ",
  statusInactive: "Không hoạt động",
  progress: "Tiến độ",
  stepError: "(lỗi)",
  stepCompleted: "(đã hoàn thành)",
  statusToDo: "Cần làm",
  statusInProgress: "Đang làm",
  statusInReview: "Đang duyệt",
  statusDone: "Hoàn thành",
  statusBlocked: "Bị chặn",
  statusCancelled: "Đã huỷ",
  statusPercent: (percent) => `hoàn thành ${percent}%`,
  propertyEmpty: "Trống",
  propertyAdd: (label) => `Thêm ${label}`,
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
  chartOfTarget: (value, target) => `${value} trên ${target}`,
  chartProjected: "dự kiến",
  chartHighest: "Cao nhất",
  chartLess: "Ít",
  chartMore: "Nhiều",
  chartAverage: (value) => `TB ${value}`,
  chartAverageLong: (value) => `trung bình ${value}`,
  chartActual: "Thực tế",
  chartTarget: "Mục tiêu",
  chartShareOf: (share, of) => `${share} của ${of}`,
  metricSeries: (count, first, last, low, high) => `Xu hướng qua ${count} kỳ: từ ${first} đến ${last}, thấp nhất ${low}, cao nhất ${high}`,
  metricGoalOf: (target) => `trên mục tiêu ${target}`,
  total: "Tổng",
  noData: "Không có dữ liệu",
  colour: "Màu",
  chooseColour: "Chọn màu",
  saturationBrightness: "Độ bão hoà và độ sáng",
  saturationBrightnessValue: (saturation, brightness) => `Độ bão hoà ${saturation}%, độ sáng ${brightness}%`,
  hue: "Tông màu",
  colourFormat: "Định dạng",
  savedColours: "Đã lưu",
  hexValue: "Mã hex",
  red: "Đỏ",
  green: "Xanh lá",
  blue: "Xanh dương",
  saturation: "Độ bão hoà",
  lightness: "Độ sáng",
  brightness: "Độ chói",
  motionCurve: (curve) => `Đường cong chuyển động: ${curve}`,
  curveSpring: "Lò xo",
  curveBounce: "Nảy",
  curveEaseOut: "Chậm dần",
  curveEaseInOut: "Nhanh dần rồi chậm dần",
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
  listening: "Đang nghe…",
  stopDictation: "Dừng đọc chính tả",
  voiceNewRecording: "Bản ghi mới",
  voiceReady: "Sẵn sàng",
  voiceRecording: "Đang ghi",
  voicePaused: "Tạm dừng",
  voiceRecord: "Ghi âm",
  voicePause: "Tạm dừng",
  voiceResume: "Tiếp tục",
  voiceDiscard: "Huỷ bản ghi",
  voiceFinish: "Hoàn tất",
  voiceReadyGuidance: "Sẵn sàng khi bạn muốn. Nhấn Ghi âm để bắt đầu.",
  voiceRecordingGuidance: "Đang thu âm từ micro của bạn.",
  voicePausedGuidance: "Đã tạm dừng. Tiếp tục hoặc hoàn tất bản ghi.",
  voiceAssistant: "Zen voice",
  voiceListening: "Đang nghe",
  voiceResponding: "Đang trả lời",
  voiceThinking: "Đang nghĩ",
  voiceThinkingHeading: "Mình đang suy nghĩ",
  voiceThinkingGuidance: "Đang soạn câu trả lời. Bạn có thể ngắt lời.",
  voiceYouSaid: "Bạn · Đã nói",
  voiceReadyHeading: "Cùng trò chuyện",
  voiceListeningHeading: "Mình đang nghe",
  voiceRespondingHeading: "Đây là điều mình tìm được",
  voiceReadyConversationGuidance: "Hỏi một câu. Nghĩ thành lời. Bắt đầu từ đâu cũng được.",
  voiceListeningGuidance: "Cứ nói tự nhiên. Mình sẽ theo bạn.",
  voiceRespondingGuidance: "Bạn có thể ngắt lời mình bất cứ lúc nào.",
  voiceTrySaying: "Thử nói",
  voiceYouLive: "Bạn · Bản ghi trực tiếp",
  voiceAssistantSpoken: "Zen · Câu trả lời bằng giọng nói",
  voiceStartTalking: "Bắt đầu nói",
  voiceDoneSpeaking: "Nói xong",
  voiceInterrupt: "Ngắt lời",
  voiceMute: "Tắt tiếng",
  voiceEnd: "Kết thúc",
  voiceMicOffNote: "Micro của bạn vẫn tắt cho đến khi bạn bắt đầu.",
  voiceConnectedNote: "Trò chuyện bằng giọng nói · Đã kết nối micro",
  voiceMutedGuidance: "Micro đang tắt tiếng. Bật lại để nói tiếp.",
  voiceMutedNote: "Trò chuyện bằng giọng nói · Micro đang tắt tiếng",
  playVoiceMessage: "Phát tin nhắn thoại",
  pauseVoiceMessage: "Tạm dừng tin nhắn thoại",
  voiceReadyToPlay: "Sẵn sàng phát",
  voicePlaying: "Đang phát",
  playbackSpeed: (speed) => `Tốc độ phát ${speed}`,
  voicePosition: "Vị trí phát",
  voicePositionValue: (elapsed, duration) => `${elapsed} trên ${duration}`,
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
