# Product patterns: from a brief to a screen plan

**These are principles, not rules.** A brief names a product ("an HR app", "a delivery tracker"); this file lists the
screens such products usually need, what people must find easy in them, what earns their trust, and what to avoid,
with the Zen template and components to start from. Use it to turn a brief into a screen list (zen-figma-design §1.4,
design-principles §0) and to spot a missing screen or state. Nothing here is machine-checked.

- The brief wins: build the screens it asks for. A family's list is a checklist of what people will look for, not a
  scope to add on your own; name a missing screen in the report instead of building it unasked.
- Families give no colours, fonts or styles. Every product is Zen: its look comes from the Zen tokens, the project's
  theme and the design principles (Brand / Accent leads the screen).
- Mixed products take from several families (an HR app with payroll reads Finance for its money screens).

Sources: the product types, key considerations and anti-patterns of the UI/UX Pro Max skill (MIT), kept only where
they hold for app screens, mapped to Zen; Zen's own templates. Evaluation:
`docs/research/ui-ux-pro-max-evaluation-2026-10-26.md` in the Zen DS repo.

## Start from a template

| Product | Figma (Zen file) | Closest code start (`src/templates`, zen-ds MCP `get_template`) |
| --- | --- | --- |
| HR, people operations | `◆ HR-Platform` | `HrHomeTemplate`, `HrTasksTemplate`, `HrMyLeavesTemplate`, `HrLeaveTypesTemplate`, `HrMyExpensesTemplate`, `HrExpenseOverviewTemplate`, `HrPublicHolidayTemplate` |
| Finance, banking, wallets | `◆ Finance` | `MobileListTemplate` (a list with filters), `MobileDetailTemplate`, `DetailTemplate` |
| E-commerce, ordering | `◆ Ecommerce` | `MobileListTemplate` (a shop's order list), `AdminListTemplate`, `DetailTemplate` |
| Logistics, delivery | `◆ Logistic` | `AdminListTemplate`, `DetailTemplate` |
| Social, community | `◆ Social` | `MobileListTemplate`, `MobileDetailTemplate` |
| Dashboards, analytics, operations | `◆ Performance` (the Theme-01 … 08 set) | `DashboardTemplate` (an operations overview) |
| Any admin list, record page, settings, sign-in, empty or error page | — | `AdminListTemplate`, `DetailTemplate`, `SettingsFormTemplate`, `SignInTemplate`, `EmptyErrorTemplate` |

Read the template's frame or source and copy its structure before you add your own screens.

## HR and people operations

- **Screens:** a home of what needs me (my requests, approvals waiting, who is away today); leave and expense
  requests (my list, a new request, its status); an approvals queue; the people directory and a profile; an absence
  calendar; policies, leave types and holidays.
- **Easy:** asking for leave or an expense in one short form; an approver acting from the list without opening each
  request.
- **Trust:** who approves and where a request is (`BadgeStatus` for the workflow step); balances and amounts exact;
  every decision has a name and a date (`TimelineActivity`).
- **Avoid:** asking for what the system knows (the employee, the manager, the team); a status shown by colour alone;
  a balance without its unit (days, hours).

## Finance, banking and wallets

- **Screens:** an overview (balance, accounts or cards, what changed); transactions (search, filter by period and
  category; on a phone the list that closes the screen); a transfer or payment flow; budgets and limits; a statement
  or receipt; card and security settings.
- **Easy:** finding one transaction; paying the same person again.
- **Trust:** a review step before money moves (amount, recipient, fees, date: `DescriptionList`), then a receipt;
  amounts right-aligned in the currency's format; gains and losses with a sign and words, not only green and red
  (`MetricTrend`); masked account numbers with a way to reveal them.
- **Avoid:** fees that appear only at the last step; a playful look on money screens; a destructive action (cancel a
  card) without a confirmation that names it.

## E-commerce and ordering

- **Screens:** a catalog with filters (`Chip` advanced) and sort; a product page (images, price, options, stock,
  delivery estimate, reviews with `RatingDisplay`); the cart; checkout (`Stepper` when it has steps, the total in an
  `ActionBar`); orders and their tracking; returns.
- **Easy:** filtering and coming back to the same results; changing a quantity in the cart; buying as a guest.
- **Trust:** the full total (shipping, taxes, discounts) before the payment step; the return policy next to the
  price; real reviews with dates.
- **Avoid:** surprise costs; filters hidden behind a menu on desktop; forcing an account before checkout; losing the
  cart on an error.

## Logistics and delivery

- **Screens:** shipments or orders (a `Table` with status, ETA and owner); a tracking detail (the stops as a
  `TimelineActivity` or `ScheduleItinerary`, the current position, the ETA); drivers or fleet; the day's schedule
  (`ScheduleResourceGrid`); exceptions.
- **Easy:** finding one shipment by its number; seeing what is late right now.
- **Trust:** every status has the time it was last updated; exceptions (late, failed delivery) come first, with what
  to do.
- **Avoid:** tracking with no time stamp; errors that live only in a tab nobody opens.

## Social and community

- **Screens:** a feed; a profile; a composer; comments and reactions; messages (`ChatThread`,
  `ChatConversationItem`); notifications; privacy and blocking.
- **Easy:** posting and replying in a few taps; going back to the same place in the feed.
- **Trust:** Report and Block one step away from any post or person; who can see a post said before it is shared;
  deleting a message is undoable (chat.md).
- **Avoid:** autoplay with sound; reactions told by colour alone; images without alt text.

## CRM and sales

- **Screens:** contacts and companies (rows led by an `Avatar`); the pipeline by stage; a deal or contact page with its
  activity (`TimelineActivity`) and quick actions (log a call, an email, a meeting); tasks and follow-ups; reports.
- **Easy:** logging an activity from wherever the contact appears; moving a deal to the next stage.
- **Trust:** amounts and probabilities right-aligned and formatted; who changed a deal and when.
- **Avoid:** a pipeline that only works by dragging (give each card a Move to… `Menu`); decoration on dense screens.

## Dashboards, analytics and operations

- **Screens:** an overview (`MetricCard`s of one size per row, then `ChartCard`s); filters for period and scope in a
  `DashboardHeader` control bar; a drill-down from a figure to the `Table` behind it; alerts and exceptions.
- **Easy:** answering the one question the dashboard is for at a glance; changing the period.
- **Trust:** each trend says what it compares to ("vs. last month"); the time the data was last updated; a failed
  widget says so instead of drawing an empty chart.
- **Avoid:** charts that decorate rather than answer; no way to filter; error states hidden; every card emphasised.
- **Layout:** one widget grid, the hero sized by importance, rows that fill at every width: `dashboard-layout.md`
  (next to this file).

## Projects and tasks

- **Screens:** my tasks (today, overdue); a project's tasks as list, board or calendar (`Segmented`); a task detail
  in a `SidePanel` with its properties (`PropertyField` rows: status, priority, assignee, due date) and its activity;
  a new task; the team's workload.
- **Easy:** creating a task in one line; changing status, priority or assignee in place.
- **Trust:** priority in one palette led by the flag icon; the assignee as an Avatar; overdue said in words.
- **Avoid:** switching views loses the filters; status changes that only work by dragging.

## Health and patient portals

- **Screens:** appointments (book, reschedule, cancel); results over time with their normal range; medications and
  refills; messages with the care team; records and documents.
- **Easy:** booking or moving an appointment; reading a result and what it means.
- **Trust:** plain language beside every medical term; who can see the person's data; urgent contacts always
  reachable.
- **Avoid:** a result flagged by colour alone; heavy motion; small text (check the largest Typography mode).

## Education and learning

- **Screens:** my courses with progress (`ProgressBar`); assignments and deadlines (`CalendarAgenda`); a lesson; a
  quiz with its feedback; grades.
- **Easy:** continuing where I stopped; seeing what is due next.
- **Trust:** deadlines with the date and the time left; grades with how they were counted.
- **Avoid:** assignments hidden inside a course page; jargon; a phone layout that is only the desktop shrunk.

## Booking and scheduling

- **Screens:** choose the service and the person or place; pick a date and a time (`ScheduleSlotPicker`); a summary
  before confirming; the confirmation; my bookings with reschedule and cancel.
- **Easy:** seeing the free times at once; rescheduling as easily as booking.
- **Trust:** the price, the duration, the place and the cancellation terms in the summary; a reminder.
- **Avoid:** losing the chosen slot after an error; cancelling hidden in a menu.

## AI assistant

- **Screens:** an empty state with suggested prompts; the conversation (`AiChatThread`, `AiChatField`) with answers to
  copy, rate and retry; the sources or data the answer used; history.
- **Easy:** asking again or refining an answer; stopping a long answer.
- **Trust:** the assistant shows it is working at once and while it streams; a failure keeps the question and offers
  Try again (a Negative `InlineMessage`); what the assistant can see is said.
- **Avoid:** heavy chrome around the conversation; a silent wait.

## Devices and smart home

- **Screens:** rooms or devices with their status and a quick control; one device's detail; energy use; automations.
- **Easy:** switching a device in one tap from the overview.
- **Trust:** the control reflects the real state, with the time it was last seen when it is offline; a command that
  fails says so.
- **Avoid:** stale states with no time; controls that look on while the device is offline.

## Settings and admin

- **Screens:** settings in sections (`SettingsFormTemplate`); users, roles and invitations (`AdminListTemplate`);
  billing; an audit log.
- **Easy:** finding a setting by its words (a Search over long settings); seeing what a role can do.
- **Trust:** a `Toggle` acts at once, a form section saves with its own button, never a mix inside one section;
  destructive settings sit last in their own section with a confirmation.
- **Avoid:** a Save button far from the fields it saves; a role change without a summary of its effect.
