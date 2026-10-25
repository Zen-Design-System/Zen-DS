# UX principles for Zen screens: states, forms, navigation, access

**These are principles, not rules.** They cover what no single component owns: how a whole screen or flow behaves.
The rules (`docs/component-usage-rules.md`, each component's guideline, `npm run usage:check`, the Figma audit) say
what is wrong; this file helps you plan the states and flows the rules leave to you. Nothing here is machine-checked,
and a line here does not become a check on its own.

- When the brief, a Zen template or the designer's own edit chooses differently, follow them and say why in the report.
- When a principle seems to fight a rule or a component's guideline, the rule wins. The principle is then a reason to
  ask, not to override.
- The same principles hold in code, in Zen Studio and in Figma. Names are given both ways where they differ (Figma
  states are frames next to the screen; in code and Studio they are the same page with other data).

Sources: WCAG 2.2; Apple HIG (Feedback, Navigation, Entering data); Material 3 (Navigation, Forms); the GOV.UK Design
System (validation, error summary); NN/g on response times. The selection started from the UI/UX Pro Max skill's
UX guidelines (MIT); the evaluation is `docs/research/ui-ux-pro-max-evaluation-2026-10-26.md` in the Zen DS repo.
Colour, composition and hierarchy are in `design-principles.md`; layouts across widths in `responsive-principles.md`.

## 0. Plan the flow before the screen

For each screen of the brief, write down before you build it:

- **The way in and the way out:** where the person comes from, the one thing they came to do, and where they go after
  it (the next screen, back to the list, a confirmation).
- **Its states:** empty, loading, partly loaded, failed, done, and the open overlays (a menu, a dialog, a sheet). In
  Figma each is a frame next to the screen (zen-figma-design §3.4); in code and Studio, the same page with that data.
- **What can go wrong:** a field the person gets wrong, a save that fails, no network, no permission.
- **What must survive:** what the person typed, the filters they set, where they scrolled.

## 1. Every screen has its states

| The situation | What the person sees | Zen part |
| --- | --- | --- |
| Loading, under about a second | Nothing new: no flash of a spinner | — |
| Loading, longer | The layout to come, in grey | `SkeletonText`, `SkeletonHeading`, `SkeletonShape` in the shape of the content; `Image` keeps its frame by itself |
| Long work with a known end (an upload, an import) | How far it is, and what it is doing | `ProgressBar` or `ProgressCircle`; `FileUpload` for files |
| Nothing to show yet | Why it is empty and the action that fills it | `EmptyState` with that action; `size="sm"` when it fills one region of a page |
| Nothing matches a search or filter | That the filter is the reason, and how to clear it | `EmptyState` naming the query, with Clear filters |
| A part failed to load | What failed, what still works, and Try again; keep what did load | `InlineMessage` theme negative with an action, in place of the part |
| A condition about the whole page or app (offline, a trial ending) | One message at the top that stays until it is resolved | `AlertBanner` |
| An action finished | A short confirmation; Undo when it can be taken back | `Toast` (titles ≤ 60 characters, never a question) |
| A destructive action | Undo when the data can come back; otherwise a confirmation that names what is lost | `Toast` with Undo, or `Dialog` + Button level danger |

- **Respond at once.** Every press shows its pressed state at once (Zen controls do); work that takes longer says so
  where the person is looking (the button, the row, the card), not only at the top of the page.
- **Never block what still works.** A failed chart leaves the rest of the dashboard usable; a slow table keeps its
  header, filters and actions.
- **Errors say what happened and what to do:** "Couldn't save the leave request. Check your connection and try
  again.", never "Error 500" or "Something went wrong" alone.

## 2. Forms

Zen's Form already handles the mechanics: a failed submit moves focus to the first invalid field and announces how
many need attention; each field shows its own error under it (`docs/guidelines/form.md`). Plan the rest:

- **Every field has a visible label;** the placeholder shows an example, never the label. Help text that prevents an
  error goes under the field before the error happens (requirements, formats; `InputConditions` for password rules).
- **Show a field's error when the person leaves it or submits,** not on every keystroke; clear it as soon as the value
  is right.
- **Never disable the submit button until the form is valid.** Let people submit, then focus and explain the first
  problem (form.md).
- **A long form (several sections or a page of fields)** adds a summary above the fields after a failed submit: an
  `InlineMessage` theme negative listing each problem. The inline errors stay.
- **Never ask twice** for what the flow already knows (WCAG 3.3.7): prefill it, or offer "Same as the billing
  address" (a `Checkbox`).
- **Sign-in and passwords** accept paste and password managers (WCAG 3.3.8): no blocked paste, the right
  `autoComplete`, a show-password action in the field's trailing slot.
- **Group what belongs together** (`FormFieldset`, a heading per section) and put optional fields last or behind
  More options.
- **Keep what was typed.** A long form or an editor keeps a draft, or guards leaving: an `ActionBar` with the unsaved
  status and a `Dialog` when the person leaves with changes. A failed save keeps every value.
- **One submit at a time:** while it saves, the submit says it is working (useFormState `isSubmitting`) and cannot be
  sent twice.
- **Where the form lives:** a Dialog holds one field at most; two or more fields are a ModalForm on desktop and a
  BottomSheet on a phone (component-usage-rules, forms in overlays).

## 3. Navigation and wayfinding

- **Always answer "where am I?":** the Sidebar row of the current page is selected, the page title is the one h1, and
  a page below the top level shows Breadcrumbs on desktop or Back (the chevron) on a phone.
- **One navigation pattern per level.** Top-level destinations live in the Sidebar on desktop and the
  BottomNavigation (3–5) on phone roots; views inside a page are Tabs or Segmented. Never offer the same level twice
  (Tabs that repeat the Sidebar).
- **Back returns to the same place:** the list keeps its scroll position, filters, sort and selection. Keep that state
  in the URL in code, so a reload and a shared link restore it too.
- **Every key screen has its own address** (a record, a tab, a filtered list), so it can be shared, bookmarked and
  opened from a notification.
- **After moving to a new page, focus goes to its main content** (AppShell's skip link and `<main>` target); after a
  dialog closes, focus returns to what opened it (Zen overlays do).
- **Destructive and leaving actions sit apart:** Delete last in a Menu after a separator (`danger`), Sign out last in
  the account Menu, a Delete workspace section at the end of Settings.
- **A destination the person cannot use yet stays visible** and says why (a disabled item with its reason, an
  EmptyState that names the missing permission), instead of disappearing.
- **Search is where people look for it:** the AppShellHeader on desktop, the top of a phone list or its own tab.

## 4. Access for everyone (WCAG 2.2 beyond what components do)

Zen components bring their keyboard patterns, names and focus rings. A screen still has to:

- **Keep the focused control visible:** a sticky header, an ActionBar or a toast never covers it (2.4.11). Give the
  scroller `scroll-padding` for the part of a header that stays (top-navigation.md).
- **Offer a click or keyboard way for every drag** (2.5.7): reorder with Move up / Move down in a Menu, drop files or
  browse (`FileUpload`), drag a Slider or type the number (`SliderField`).
- **Keep targets big enough:** at least 24px for a pointer on desktop (2.5.8) and a 44px hit area on touch screens
  (screen-rules, Figma audit `touch/target-spacing`).
- **Put help in the same place on every page** (3.2.6): the help action in the AppShellHeader, the same link in the
  same footer.
- **Keep the outline:** one h1, then h2, h3 in order (`Heading level` follows the outline, not the size).
- **Never rely on colour, position or shape alone:** a status has words, a chart series has a label, a required field
  says Required.
- **Let the text grow:** the screen still works at 200% zoom and in Comfortable density with the largest Typography
  mode; text wraps instead of being cut, and a cut label shows the full text on hover and focus.
- **Say the language** of the page and of any passage in another language (`lang`), so screen readers pronounce
  Vietnamese and English correctly.

## 5. Touch and gestures

- **Every gesture has a visible alternative:** a swipe-to-delete row also has its ⋯ Menu; pull to refresh also has a
  refresh action or refreshes on return.
- **Don't fight the system:** no custom swipe from the screen's edge (it is the system's Back); no horizontal swipe on
  content that scrolls sideways.
- **Keep controls clear of the safe areas** (the notch, the home indicator): TopNavigation, BottomNavigation and
  ActionBar add the insets; your own floating parts must too.
- **Thumbs reach the bottom:** the main action of a phone screen sits in the ActionBar or the bottom half, not in the
  top corner alone.

## 6. Motion that explains

Zen's motion tokens set the durations and curves, and reduced motion removes the movement (`--zen-motion-*`). Choose
*what* moves:

- **Motion shows where something came from or went:** a sheet rises from the bottom, a menu grows from its trigger,
  a deleted row collapses so the next one takes its place.
- **One thing moves at a time** in a region; never animate to make the person wait.
- **Anything that moves on its own** (a carousel, a live ticker) can be paused and stops on focus (2.2.2).

For a screen that passes every check, look at it with real data: `design-principles.md` §9 lists the questions.
