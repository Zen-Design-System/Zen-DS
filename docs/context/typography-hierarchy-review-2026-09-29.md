# Typography outline and content hierarchy — review of 2026-09-29

The user asked whether the rules on Typography › Content hierarchy were researched against other design systems (they were not: only Figma and Apple HIG) and said something still felt wrong. Evidence: a rule inventory plus Playwright measurement of all 61 platform pages, and web research of Apple HIG, Material 3, Fluent 2, Primer, Polaris, Atlassian, Carbon, GOV.UK, Spectrum, SLDS, Ant Design, Pajamas, EUI, React Navigation, WCAG 2.2, WAI tutorials, the HTML spec, axe-core and WebAIM. A synthesis agent re-opened the sources behind every adjust/wrong verdict. Nothing was changed; every fix needs the user's approval (Scope lock). Verdicts, contradictions, live violations and the decisions for the user follow.

## Summary

Verdict: the desktop ladder is mostly sound and matches industry practice: one h1 page title, h2 sections, values not headings, weight for emphasis, short sentence-case titles. The 'something is wrong' feeling comes from five sources.
(1) The user's 'h1 = Heading/1' began as a fix for desktop page titles rendered at Heading/3. It was generalised to every h1, which produced the phone child-screen rule 'no h1, start at h2'. Every source contradicts that rule: Apple's nav-bar header trait and SwiftUI's 'precede every leveled heading except h1', Material, Pajamas, EUI, React Navigation, TetraLogical 2026, axe page-has-heading-one and WebAIM. None of this is WCAG-required. No system surveyed ties h1 to one style (Material, Spectrum, Fluent, Primer, Polaris, Carbon, GOV.UK), so this is the user's decision, and narrowing it to 'the page title shown large is Heading/1' fixes the phone rules without touching font sizes.
(2) Component defaults teach other ladders. Heading maps 2→Heading/2 and 3→Heading/3. The Text page and fixtures say h2 = Subheading. ListItem is Bold where the ladder says Medium. PageHeader and TopNavigation tie style to level. EmptyState is fixed at Heading/4. Overlays come in four styles. AGENTS.consumer.md shows a forbidden h1 Heading/3. As a result h2 renders in 6 styles and h3 in 7 across the platform.
(3) The Typography page's own examples break its rules: sibling h2s in two styles on the child screen, a 12px base-tone list-group h2 that the audit itself would call an error, and values larger than the h1.
(4) Enforcement is both too strict and too weak. The 'heading smaller than body' error and the 'overlay must be h2' error go beyond any standard and clash with Zen's own list headers and component API. Meanwhile, missing h1s, outlines starting at h3/h4, same-level mixed styles and EmptyState inside ChartCard all pass npm run qa, and the Strongest-tone check has a colour-matching bug.
(5) Phone examples render in Dashboard typography, and TopNavigation drops its h1 on scroll.
Checked in this pass (WebFetch/browser): the Material structure page, Spectrum heading, Apple header trait, SwiftUI heading levels, HIG typography quotes, Pajamas, EUI, React Navigation, TetraLogical, axe, the WAI headings tutorial, WCAG 2.4.6, G117, the HTML spec ('must' for no-skip, 'should' for level 1), GOV.UK headings and summary card, Polaris kicker rule, Polaris web-component levels, Primer headings and Dialog h1, Atlassian ModalTitle h1, Carbon PageHeader h1, Fluent Subtitle1 as h1 and MenuGroupHeader, and WebAIM 2017.
Dropped or downgraded: the claim that the APG chair said 'h1 or h2' (not in issue #3395); the APG move to h1 was made for a table-of-contents bug and counts only as weak evidence. Polaris 'headings don't need to be larger' was not found; only the 'equal or larger unless lede or kicker' wording was confirmed. Unverified research claims (Primer ActionList, Spectrum S2 menus, Apple list-header sizes, the Spectrum ratio) are marked medium or low.
Only a little here is WCAG-required: 1.3.1 (what looks like structure must be marked up as structure, including unread-by-weight via G117) and 2.4.2 (document.title). One h1 and no skipped levels are best practice (the no-skip rule is an HTML 'must'). Overlay h1 vs h2, heading sizes and 'h1 = Heading/1' are house taste.
No repo or Figma files were changed. All fixes need the user's approval under the scope lock.

[KEEP/high] Desktop · Master page title: h1 · Heading/1 (PageHeader) 
  WHY: Every system surveyed has one h1 that names the page: Material ('A single H1 for the page title is recommended', checked on m3.material.io), Primer (h1 'reserved to describe the page as a whole', checked), Carbon PageHeader titleAs='h1' (checked), Polaris Page <h1> (checked), Atlassian and Pajamas. In WebAIM's 2017 survey, 60% of screen-reader users preferred one h1 holding the document title (checked). This is best practice, not a WCAG requirement: SC 2.4.6 'does not require headings' (checked), and HTML only says 'should' have a level-1 heading (checked). The title's size is a matter of taste: Carbon 28px regular, Atlassian 24, Polaris headingLg 20, GOV.UK heading-l or xl. Heading/1 at 28p 
  PROPOSAL: No change. 
  AFFECTS: User's own rule h1 = Heading/1 (kept on desktop).

[KEEP/high] Desktop · Child page title: h1 · Heading/1 + Back named after the parent, or Breadcrumbs 
  WHY: Polaris and Primer use the same page-title element and style on list and detail pages, and Primer adds a ParentLink to go up. This agrees with the master row. 
  PROPOSAL: No change. Add one line: document.title changes with each view and matches the h1 (see the missing-rule verdict on WCAG 2.4.2). 
  AFFECTS: docs only

[KEEP/medium] Desktop · Page description: p · Body/Base/Regular · base 
  WHY: Carbon PageHeader uses body-01 for the description, and Primer uses body text. GOV.UK uses a larger lead paragraph once per page, which is a stylistic choice and not a consensus. 
  PROPOSAL: No change. 
  AFFECTS: 

[ADJUST/high] Desktop · Section title: h2 · Heading/4 (Heading level 2 · Table caption) 
  WHY: All systems agree sections are h2. Zen, however, has two canonical h2 styles. The Heading component maps level 2 to Heading/2 (Text.tsx headingStyleByLevel). The Text page, Heading JSDoc, text.md:48, the harness good fixture and SettingsFormTemplate teach h2 = Heading/Subheading. Only this ladder says Heading/4. Separately, a table <caption> is not a heading, because it does not appear in the headings list (WAI Tables tutorial). Table.tsx renders the caption in Heading/4, so it looks like a section heading but isn't one; WCAG failure F2 describes that pattern. 
  PROPOSAL: 'Section title (a group of cards, a table, a list): h2 · Heading/4. A table that is its own section gets an h2 Heading/4 above it and the Table points to it with aria-labelledby. Table caption only names a table that already sits under a section heading.' Align the Heading JSDoc, text.md, the appLayer/text examples, fixtures/good.tsx and SettingsFormTemplate with Heading/4. 
  AFFECTS: Text.tsx JSDoc and defaults, docs/guidelines/text.md, appLayer/text.tsx, usage-guard fixtures, SettingsFormTemplate, Table caption guidance. No font-size change.

[ADJUST/high] Desktop · Card or widget title: h3 · Heading/Subheading 
  WHY: A fixed h3 skips a level whenever a card sits directly under the h1, which breaks Zen's own no-skip rule. The memory file already contains the ChartCard headingLevel 2 exception. Peers derive the card level from structure: the GOV.UK summary card headingLevel defaults to 2 (checked), Polaris web components go h2→h3→h4 by nesting depth (checked), SLDS card titles are h2, and Carbon's Heading/Section increments automatically. On style, Subheading 18px under Heading/4 20px, at the same weight and tone, is a 1.11× step, so a card title barely reads as a level below a section. Carbon and M3 change weight between adjacent tiers. Polaris, Carbon and Atlassian title containers at 13–16px. 
  PROPOSAL: 'Card or widget title: one level below the nearest heading above it (h3 under a section h2; h2 when the card sits directly under the page title) · always Heading/Subheading. The style follows the kind of content, not the level.' Whether card titles should use a smaller existing style is left to the user (see decisions). 
  AFFECTS: Ladder row, ChartCard/Card examples, DashboardTemplate (an h2 Subheading card next to an h2 Heading/4 section becomes legitimate because they are different kinds of content).

[ADJUST/high] Desktop · Row or item title: not a heading · Body/Base/Medium (Bold when unread or primary) 
  WHY: Row titles not being headings matches M3 (the list label is Body Large, not a heading). But the ListItem component hard-codes Body/Base/Bold (ListItem.tsx:65; Figma Info-Content Title), so every row in the ladder's own examples renders Bold, and read and unread rows look the same by default. Separately, when weight alone signals unread, WCAG 1.3.1 applies. G117 (checked) says 'state the information explicitly in the text'. 
  PROPOSAL: Choose one default (see decisions). Then: 'Row title: not a heading · <chosen default>. Unread = Body/Base/Bold with a Strongest caption; read = Body/Base/Medium with a light caption. Unread is also stated in text: a visually hidden Unread, or a Badge or dot with a label.' 
  AFFECTS: ListItem.tsx default, EmphasisExample, SKILL.md:66-67, memory file.

[KEEP/high] Desktop · Body copy: p · Body/Base/Regular 
  WHY: This is standard in every system surveyed. 
  PROPOSAL: No change. 
  AFFECTS: 

[ADJUST/medium] Desktop · Secondary copy / meta: Body/Small/Regular · base · Caption/Regular · light 
  WHY: The rule is right, but Body/Small and Caption differ by only 1px: 12 vs 11 in Dashboard (1.09×) and 14 vs 13 in Mobile (1.08×). Size alone doesn't separate them, so tone does the work. Fluent says a lighter neutral subdues text. 
  PROPOSAL: Add: 'Caption is always in the light tone; Body/Small meta is in the base tone.' 
  AFFECTS: 

[ADJUST/medium] Desktop · Values and metrics: not a heading · Display/4 · Heading/2 
  WHY: 'Not a heading' is well supported: WCAG F43 (heading markup used only for its look), Primer 'Do not use heading elements solely for resizing text' (checked), Polaris large numbers as='p', and Atlassian's separate metric styles. What is missing is a size limit. Display/4 is larger than Heading/1 in every mode (32/28, 36/32, 40/36), so on the Master page example and the Dashboard template several values are the largest text on the page. That conflicts with the Build-QA line 'one obvious entry point; title > body > meta'. NN/g's advice to keep no more than two big elements is guidance, not a standard. 
  PROPOSAL: 'Values are never headings (span or p). One hero value per view may use Display/4. Values in a grid of cards use Heading/2 or Heading/3 so the page title stays the largest heading-style text.' MetricWidget 'large' (Heading/1) follows the same rule. 
  AFFECTS: MetricWidget, DashboardTemplate, Master page example. No token change. User decision.

[ADJUST/high] Phone · Master screen title: h1 Heading/1 large title → Body/Extra/Bold bar title on scroll 
  WHY: The visual fold is backed by Apple (a large title turns into a standard title on scroll: HIG Toolbars, WWDC17) and by M3 (medium and large app bars collapse to small). But TopNavigation unmounts the h1 once collapsed (showLarge, TopNavigation.tsx:111/155), and the bar title that replaces it is a div. A scrolled screen therefore has no heading. On iOS the navigation-bar title carries the header trait ('such as the title of a navigation bar', checked). axe page-has-heading-one flags a page without an h1 (Deque best practice, moderate, checked). Many tab roots in the examples use only a compact title, with no largeTitle. 
  PROPOSAL: 'Master screen title: exactly one h1 at all times. Expanded: the large title is the h1 (Heading/1) and the bar copy is aria-hidden. Collapsed: the bar title is the h1 (role=heading aria-level=1, Body/Extra/Bold). Tab roots use largeTitle.' The collapsed half depends on decision 1; the fallback is a visually hidden h1. 
  AFFECTS: TopNavigation.tsx, phone examples, and the scope of the harness h1 rule. Touches the user's h1 = Heading/1 rule.

[WRONG/high] Phone · Child screen title: compact bar title (not an h1); content headings start at h2 
  WHY: Every source that addresses this points the other way. Apple: the nav-bar title is a header (checked), and SwiftUI says 'Except for h1, be sure to precede all leveled headings by another heading with a level that's one less' (checked), so an h2 with no h1 breaks Apple's own model, the source Zen cites. Pajamas: 'Every page should have a level 1 heading. It can be visually hidden' (checked). EUI rebuilds a hidden h1 when the title is missing (checked). React Navigation's bar title is role=heading aria-level=1 (checked). TetraLogical 2026: all five iOS apps tested exposed the screen title as a heading (checked). Material recommends a single H1 for the page title (checked). axe page-has-heading 
  PROPOSAL: 'Child screen title: the screen's h1, shown in the compact bar in Body/Extra/Bold. TopNavigation compact renders the bar title as role=heading aria-level=1. Content sections start at h2.' If the user keeps h1 = Heading/1 literally: 'a visually hidden h1 in Heading/1 carries the bar title's text, and the bar title is aria-hidden' (the MobileDetailTemplate pattern). 
  AFFECTS: Touches the user's rule h1 = Heading/1 (decision 1). Affects TopNavigation, PlatformTypographyHierarchy row + rule 1, the appLayer/text mobile example, MobileDetailTemplate and the memory file.

[WRONG/high] Phone · Section title in content: h2 · 'Heading/4 · Heading/Subheading below it' 
  WHY: The row describes a visual sub-level that the markup doesn't express. 'Arriving Friday' is an h2 in Heading/4, sitting beside h2s in Heading/Subheading that the description calls 'sections under it'. WCAG 1.3.1 (required, level A) says structure shown visually must be programmatically determinable. It also breaks Zen's outline rule 3 and Carbon's and GOV.UK's consistency guidance ('Style headings consistently'). 'Arriving Friday' is a status, which is closer to a value than a section title. 
  PROPOSAL: 'Section title in content: h2 · Heading/4 (as on desktop), one style for all sibling sections. Card or group titles inside a section are h3 · Heading/Subheading. A key status line is not a heading: Body/Extra/Bold text in the Strongest tone under the title.' 
  AFFECTS: The ChildScreenExample, MobileDetailTemplate (h2 Heading/3 + h2 Heading/4), ladder row.

[ADJUST/medium] Phone · List group header: h2 / h3 · Body/Small/Bold · base 
  WHY: Small, subdued group labels are normal practice. Fluent's MenuGroupHeader is fontSizeBase200 (12px) semibold over 14px items (checked). Polaris: 'Headings should be equal or larger in size than the following text, unless they are used as a lede or kicker' (checked). Apple's Headline is the same size as Body and differs only by weight (checked). Primer's ActionList GroupHeading (small, muted) and Atlassian's HeadingItem (12px, subtle) point the same way (from research, not re-opened). The ladder row itself is defensible. What is wrong is everything around it: Zen's audit errors on 'heading smaller than body' and warns 'titles use Strongest'; example-patterns.md:39 says Strongest; the List Ite 
  PROPOSAL: 'List group header: a heading one level below the nearest heading above (h2 on a screen whose h1 is the title) · Body/Small/Bold · base tone. It is a kicker label, exempt from the smaller-than-body and Strongest checks. Group labels inside Menu, Popover, Select and Listbox are labels, not headings.' Tone is the user's call (decision 4). 
  AFFECTS: quality-checks.mjs, example-patterns.md:39, the ListItem grouped example, memory file.

[ADJUST/medium] Overlays · Dialog / Side Panel / Bottom Sheet title: h2 inside the overlay, the component's own style (never Heading/1) 
  WHY: Systems split on the level. h2: Material Web md-dialog <h2 id='headline'> (checked), Carbon Modal, Polaris Modal, Fluent DialogTitle, React Aria. h1: Primer Dialog.Title (checked), Atlassian ModalTitle (checked), SLDS 2.17+, EUI modal. The APG modal example moved to h1 on 2026-03-04, but PR #3412 did it to fix a table-of-contents bug, and a reviewer said 'We usually don't use H1 elements like this' (checked). It is weak evidence either way, and no WCAG criterion fixes the level. So h2 is a sound default, but the audit error on anything else contradicts the Dialog/ModalForm/SidePanel API (headingLevel 1|2|3). On style, 'own style' produces four looks: ModalForm Heading/2 (25px, close to the p 
  PROPOSAL: 'Overlay title: h2 by default, never styled Heading/1. List the Figma style per overlay in the table: Dialog Heading/3 · Bottom Sheet Heading/3 · Side Panel Heading/3 (Heading/4 under the icon in the modal type) · ModalForm Heading/2.' The h1 option and the ModalForm style are decisions 5a and 5b. 
  AFFECTS: Ladder overlay row, quality-checks.mjs:126, Dialog/ModalForm/SidePanel headingLevel API, SidePanel guideline text.

[ADJUST/high] Outline rule 1 · One h1 per page (the page title), always Heading/1; a phone child screen has no content h1 
  WHY: 'One h1 that names the page' is sound best practice (see above; not required by WCAG or HTML). 'Always Heading/1' matches no system surveyed. Material: 'The page's visual styling does not need to match the heading levels' (checked). Spectrum: heading level 'independent of typography component, size, weight' (checked). Fluent's README example is <Subtitle1 as='h1'> (checked). The Primer Dialog h1 is 14px; the Polaris page h1 is headingLg; Carbon's h1 is 28px regular; GOV.UK uses heading-l, heading-xl or a 48px panel for an h1 (checked). The coupling began as the user's valid complaint that desktop page titles rendered at Heading/3 (session log 2026-09-27). It was then generalised to every h1, 
  PROPOSAL: 'Exactly one h1 per page or screen, present at all times, naming the page (and matching document.title). Where the title is shown large (PageHeader, a phone large title) it is Heading/1. A compact app bar keeps its bar style (Body/Extra/Bold).' This keeps the user's intent for every visible page title and changes no font size. 
  AFFECTS: User's own rule h1 = Heading/1 (decision 1). Affects harness heading/h1-is-heading-1, quality-checks.mjs:123, Text JSDoc and the memory file.

[ADJUST/high] Outline rule 2 · Levels go down one step at a time; never skip a level to get a smaller look 
  WHY: The core is right and rests on HTML conformance, not WCAG. HTML: each following heading 'must have a heading level that is less than, equal to, or 1 greater than lead's heading level' (checked). Material, Primer, Atlassian and Pajamas agree. WAI says skipping 'should be avoided where possible', and it names two exceptions Zen doesn't state (both checked): 'It is ok to skip ranks when closing subsections' (h4 → h2), and headings in fixed regions such as sidebars keep their rank on every page. The rule is also silent on where an outline starts, which is why 45 page-like examples start at h3 or h4. 
  PROPOSAL: 'Going deeper, step down one level at a time (h1 → h2 → h3). Going back up may jump (h4 → h2). Every page or screen starts at h1. A component's headings take their level from where it is placed (headingLevel). Headings in fixed regions (Sidebar, Drawer) keep the same level on every page.' 
  AFFECTS: 

[ADJUST/high] Outline rule 3 · A heading is never larger than the heading it sits under; the same kind of content takes the same style everywhere 
  WHY: Part A is a good default inside one content layer, but peers compare layers separately. M3's small app-bar title (Title Large 22) is smaller than content headlines. SLDS's modal title (20 bold) is larger than its page h1 (18). GOV.UK lets a team change the heading hierarchy 'in rare cases' after accessibility testing (checked). Zen's own phone child screen (bar title 18px over a 23px h2 in Mobile mode) needs this carve-out. Part B is right, and Material and Spectrum support choosing the style by kind, not by level. The rule is missing the converse, which WCAG 1.3.1 requires: content that looks subordinate must be nested one level deeper in the markup. 
  PROPOSAL: 'Inside one content area (the page body, a card, an overlay), a heading is never larger than the heading it sits under. The app bar title and overlay titles are compared only within their own layer. The same kind of content takes the same style on a page, whatever its level. Content that looks subordinate is marked up one level deeper.' 
  AFFECTS: 

[ADJUST/high] Outline rule 4 · Emphasise inside a level with weight and tone, not a bigger style (HIG bold trait) 
  WHY: The rule is well supported: M3 emphasized styles for unread and selected, Fluent Strong/Stronger, Polaris lowering weight for a card sub-level, and the HIG bold-trait quote (checked). But Apple's own sentence is 'Adjust font weight, size, and color as needed to emphasize important information' (checked). 'Not size' is therefore the user's rule, not HIG, and the page should say so. Primer says colour shouldn't be the main emphasis tool, so tone is mainly for de-emphasis. G117 covers weight that carries a state. 
  PROPOSAL: 'Emphasise inside a level with weight (Regular → Medium → Bold), and quiet secondary text with tone (light → base). Sizes stay as they are (a Zen rule; Apple also allows size). When weight carries a state (unread, new), state it in text too.' 
  AFFECTS: User's own rule 'do not change font sizes' (kept, re-labelled).

[KEEP/high] Outline rule 5 · Big numbers, prices and metrics are values, not headings; a heading is chosen for its place in the outline, never for its size 
  WHY: WCAG F43, Primer (checked), Polaris as='p' for big numbers, Atlassian metric styles and M3 Display for numerals. 
  PROPOSAL: Keep. Add one clause: 'values do not outrank the page title, except one hero value per view' (see the values verdict). 
  AFFECTS: 

[ADJUST/medium] Outline rule 6 · Overlays title themselves via the title prop (an h2) and never use Heading/1 
  WHY: Same evidence as the overlay row. The level is a convention, not a standard, and Zen's API already accepts 1|2|3. 
  PROPOSAL: 'Overlays title themselves via the title prop: an h2 by default, never styled Heading/1.' Whether h1 is allowed for modals is decision 5a. 
  AFFECTS: 

[KEEP/medium] Outline rule 7 · Titles are short, unique to the screen, sentence case, never the app's name 
  WHY: GOV.UK: 'Write all headings in sentence case' (checked). WCAG 2.4.6: 'a word, or even a single character, may suffice' (checked). The Apple HIG Toolbars page says keep titles under 15 characters and don't use the app name (research). Carbon asks for a brief verb phrase in modal titles. Fluent and Apple use title case on iOS and macOS, which only matters for the SwiftUI port. 
  PROPOSAL: Keep. Optionally add 'phone bar titles about 15 characters or fewer; dialog titles specific, at most two lines, ideally the verb phrase of the button that opened them.' 
  AFFECTS: 

[KEEP/medium] Outline rule 8 · Caption is for meta only; primary content is Body/Small or larger 
  WHY: This is consistent with M3 label and caption roles and with Fluent Caption. The 1px Caption vs Body/Small gap is covered by the meta-tone clarification above. 
  PROPOSAL: No change. 
  AFFECTS: 

[ADJUST/high] Enforcement · harness heading/h1-is-heading-1 (error) + quality 'h1 is not Heading/1' (error) 
  WHY: The check correctly guards the user's desktop rule. It needs a scope if decision 1 narrows the rule (a TopNavigation compact bar h1 must not fail). The consumer guide for AI agents, AGENTS.consumer.md:104, still shows <Heading level={1} textStyle='Heading/3'>, which is exactly the pattern the rule fails (confirmed in the file). 
  PROPOSAL: Keep for content h1s (Heading, Text as='h1', raw h1). Exempt the TopNavigation bar title if decision 1 goes that way. Fix the AGENTS.consumer.md:104 sample to level={2} textStyle='Heading/4'. 
  AFFECTS: User's rule h1 = Heading/1.

[WRONG/high] Enforcement · quality hierarchy 'heading smaller than the body text' (error) 
  WHY: No source supports it as a hard error. Fluent (12px group header over 14px items), Polaris (the lede/kicker exception), Apple (Headline the same size as Body) and SLDS (12px text-title) all ship headings the same size as or smaller than body text. It contradicts Zen's own list group headers. It also produces false negatives because it compares against the region's most common body size: on the Master screen, captions and the readout make that mode 12px, so the 12px 'Pinned' h2 passes. 
  PROPOSAL: Make it a warning. Compare the heading with the first text block after it, not with the region's mode. Skip Body/Small/Bold headings (group headers and kickers). Keep it an error only for Heading-family styles at h2/h3. 
  AFFECTS: 

[ADJUST/medium] Enforcement · quality hierarchy 'overlay titles are h2 and never Heading/1' (error) 
  WHY: The level part is stricter than any standard (see the overlay row) and contradicts the component API. The 'never Heading/1' part is well supported. 
  PROPOSAL: Error only on a Heading/1 style. Accept h1 or h2 for the level, or keep h2-only and remove headingLevel 1 from Dialog, ModalForm and SidePanel (decision 5a). Right now the API and the check disagree. 
  AFFECTS: 

[ADJUST/high] Enforcement · quality rhythm 'titles use Strongest' (warn) + content/title-is-strongest (CSS-only) 
  WHY: Small muted group labels are normal (see the list-header verdict), so the warning needs an exemption. It is also buggy: content-neutral-base resolves to the same rgba as content-on-white-overlay-base, so /^content-on-/ matches and the check is skipped (per the instrumented qdebug2 run). The static rule is CSS-only, so <Heading tone='base'> passes. 
  PROPOSAL: Exempt Body/Small/Bold group headers and kickers. Resolve tone by token name, not rgba equality. Add a JSX check for tone on Heading levels 1–3. 
  AFFECTS: 

[ADJUST/high] Enforcement · quality rhythm '> 7 text styles in one example' (warn, baselined for the three flagship examples) 
  WHY: The Outline readout (.pth-outline) adds three styles. audit.mjs excludes it but quality-checks.mjs doesn't, so the flagship examples look noisier than they are and the debt is baselined. 
  PROPOSAL: Exclude .pth-outline in quality-checks.mjs as audit.mjs does, then re-baseline. 
  AFFECTS: 

[ADJUST/high] Enforcement · audit 'outline' (one h1, no downward skip, no heading larger than its parent) 
  WHY: All the measured flagship contradictions pass it: an outline that starts at h3/h4, page or screen examples with zero h1, same-level siblings in different styles, and EmptyState (h3 at 20px) inside ChartCard (h3 at 18px), which passes because the stack pops same-level headings. axe heading-order also passes the first heading unconditionally, so only a separate h1-presence check catches a missing title. 
  PROPOSAL: Add checks: (a) page-like regions (screen:true examples, phone frames) expose exactly one h1, counting a bar-title h1; (b) the first heading of such a region is h1; (c) a heading inside a card is not larger than the card's own title; (d) a warning when sibling headings of the same level in one container use different styles. 
  AFFECTS: 

[ADJUST/high] Enforcement · harness table/title-heading-4 (warn) 
  WHY: It reads textStyle ?? style, but 'style' isn't the text-style prop, and the good fixture (fixtures/good.tsx:93) titles a table with <Text style='Heading/4'>, which is a paragraph and not a heading. type/visual-heading would flag the same markup written with textStyle, so the two guards contradict each other. 
  PROPOSAL: Read only textStyle. Require a <Heading> (h2 Heading/4) above a Table, or a caption. Fix good.tsx:93 to <Heading level={2} textStyle='Heading/4'>. 
  AFFECTS: 

[ADJUST/medium] Component default · Heading level → style (2 → Heading/2, 3 → Heading/3, 4 → Heading/4) 
  WHY: The defaults follow a different ladder from the documented one, so anyone (or any AI) who leaves out textStyle breaks the rule without a warning. Following the defaults, a default h4 (Heading/4, 20px) is larger than a ladder h3 (Subheading, 18px). Heading/2 and Heading/3 don't appear in the ladder at all. 
  PROPOSAL: Map the defaults to the ladder: 1 Heading/1 · 2 Heading/4 · 3 Heading/Subheading · 4 Body/Extra/Bold · 5–6 Body/Base/Bold (all existing styles). The alternative is to require textStyle for levels 2 and up. See decision 7. 
  AFFECTS: Every <Heading level> without textStyle changes look. No token or font-size change.

[ADJUST/medium] Component default · PageHeader headingLevel 2 → Heading/2; TopNavigation headingLevel h2/h3 → Heading/2/Heading/3 
  WHY: The level and the style are locked together ('the text style always follows the level', PageHeader.tsx), unlike Zen's own Heading and Primer's PageHeader (level set by as, size by variant). The TopNavigation 'Home with avatar' example is a root screen with an h2 Heading/2 large title and no h1. 
  PROPOSAL: Add a ladder row 'Page title inside a tab (PageHeader headingLevel 2): h2 · Heading/2', or map it to Heading/4. TopNavigation's large title is the screen's h1; keep h2/h3 only for a nested navigation stack, and fix the 'Home with avatar' example. 
  AFFECTS: 

[ADJUST/low] Component default · EmptyState title fixed at Heading/4 (h3 default) 
  WHY: Inside a ChartCard (h3 Subheading, 18px) it renders a same-level h3 at 20px, larger than the card title. That breaks the level rule and the size rule, and the audit misses it. 
  PROPOSAL: 'Inside a titled Card or ChartCard, EmptyState takes headingLevel one below the card title, or shows its description only (the card title already names it). A stand-alone EmptyState keeps Heading/4.' 
  AFFECTS: 

[ADJUST/medium] Component default · Accordion header in Heading/* with no heading element; Sidebar workspace name; AiChat greeting h2 Heading/1; MetricWidget large value in Heading/1 
  WHY: The WAI-ARIA APG Accordion pattern wraps each header button in a heading with a level (not re-opened this session, but a long-standing APG pattern). Text that looks like a heading but isn't one matches the F2 pattern. Zen's own type/visual-heading rule flags this, and the Accordion findings are baselined as debt. The AiChat greeting and MetricWidget use Heading/1 for things that are not the page title, which weakens 'Heading/1 = the page title'. 
  PROPOSAL: Give Accordion a headingLevel prop that renders h{n} > button. Keep the Sidebar exempt (chrome). If decision 1 keeps Heading/1 as the page-title style, add: 'Heading/1 is reserved for the page title', and move the AiChat greeting and the MetricWidget large value to Heading/2 or Display/4. 
  AFFECTS: 

[MISSING/medium] Missing · document.title follows each page or screen and matches the h1 
  WHY: WCAG 2.4.2 Page Titled (level A, required) is the only page-title requirement WCAG has. It is met by <title>, not by an h1, and the Understanding doc notes that single-page apps must update it per view. Only PlatformApp sets it, and PageHeader, TopNavigation and the templates don't mention it. 
  PROPOSAL: Add to the outline rules: 'Every page or screen sets document.title to its h1 text (plus the app name after it).' 
  AFFECTS: 

[MISSING/high] Missing · phone rules demonstrated in the Mobile typography mode 
  WHY: PlatformPhone sets no typography mode (confirmed: no 'typography' in PlatformPhone.tsx). 32 of 38 phone frames render in Dashboard sizes: h1 28, bar 16, group header 12, body 14, where Mobile ships 32/18/14/16. The 'Phone screens' rules are shown at desktop sizes, which may itself explain part of the 'something feels wrong'. 
  PROPOSAL: Phone examples render inside the Mobile typography mode (ZenProvider typography='mobile' or a PlatformPhone default). This is a platform fix, not a rule change. 
  AFFECTS: 

## Internal contradictions
 - h2 style: the ladder (PlatformTypographyHierarchy.tsx:232) says Heading/4. The Heading default (Text.tsx headingStyleByLevel) gives Heading/2. The Heading JSDoc, text.md:48, the Text page 'Page outline' example, usage-guard good.tsx:143 and SettingsFormTemplate teach Heading/Subheading.
 - Default Heading styles: a default h4 (Heading/4, 20px) is larger than a ladder h3 (Subheading, 18px).
 - AGENTS.consumer.md:104 teaches <Heading level={1} textStyle='Heading/3'>, which harness heading/h1-is-heading-1 fails as an error.
 - Phone child screen, shown three ways: the Typography page has no h1 and content at h2; the appLayer/text 'Mobile typography' example has a visible h1 Heading/1; MobileDetailTemplate has a hidden h1. The 'no h1' version also contradicts the Text 'Do' ('exactly one h1 per page') and the PageHeader 'Do
 - Child screen example: sibling h2s in Heading/4 and Heading/Subheading, described as 'sections under it'. This breaks outline rule 3 ('same kind = same style') and the visual-vs-markup match that WCAG 1.3.1 requires.
 - The child-screen ladder puts the bar title (Body/Extra/Bold 16/18px) above h2 sections at 20/23px, while rule 3 says a heading is never larger than the one above it. There is no carve-out for chrome.
 - List group header, four versions: the ladder and Typography example say Base tone; example-patterns.md:39 says Strongest; the List Item 'Grouped sections' example is h3 Strongest; the colour rule says titles are Strongest. The quality check also errors on a heading smaller than body text, while the 
 - Row titles: the ladder, SKILL.md and memory say Body/Base/Medium (Bold when unread); ListItem.tsx:65 hard-codes Body/Base/Bold (Figma Info-Content Title). The EmphasisExample has to override the title to show the difference.
 - Card titles: the ladder fixes h3, but the memory's ChartCard exception (headingLevel 2 directly under the page title) contradicts it, and a fixed h3 under an h1 breaks the no-skip rule.
 - Overlays: the rule says h2 only, but Dialog, ModalForm and SidePanel accept headingLevel 1|2|3. 'Same kind = same style' is broken across overlays: ModalForm Heading/2, Dialog, BottomSheet and SidePanel standard Heading/3, SidePanel modal Heading/4. The SidePanel guideline says Heading/3 for all typ
 - Level vs style: Heading decouples them ('level from the outline, look from textStyle'), but PageHeader ('the text style always follows the level') and TopNavigation (h2 → Heading/2, h3 → Heading/3) couple them.
 - EmptyState is always Heading/4, the section style, at h3, so inside a ChartCard it is larger than the card title it sits under.
 - Table: the ladder lists 'Table caption' as the h2 section title, but Table renders a <caption> in Heading/4, which isn't a heading. The harness good fixture titles a table with <Text style='Heading/4'> (a paragraph), which table/title-heading-4 accepts and type/visual-heading would flag if written w
 - Values: 'values never headings' is enforced, but Display/4 (32/36/40) is larger than Heading/1 (28/32/36) in every mode, against the Build-QA 'one obvious entry point; title > body > meta'.
 - The Typography rules page doesn't follow its own ladder: its sections are h2 Heading/3 and example cards h3 Heading/4, and each example's h1 sits under an h3, giving 4 h1s and h3→h1 inversions in the page outline.
 - Rule 4 cites HIG for 'weight and tone, not size', but HIG says 'Adjust font weight, size, and color'. The 'not size' part is the user's rule, not Apple's.
 - Research basis: the panel cites only Figma and Apple HIG. The Text guideline lists Material 3, WAI and Carbon as references, but none of them shaped the ladder.
 - docs/figma-audit.md:225-229 lists a type table (Heading/1 32, H2 28, H3 24) that matches none of the current modes.
 - The memory file zen-typography-hierarchy.md restates the contradictory version: list headers in base tone, no mention of ListItem Bold, phone examples in Dashboard mode, or the four overlay styles.

## Live violations (measured)
 - Phone typography mode: 32 of 38 phone frames render in Dashboard typography because PlatformPhone sets no mode. The Typography page's phone examples show h1 28 / bar 16 / group header 12 / body 14 instead of Mobile 32 / 18 / 14 / 16.
 - Phone headings: 28 of 38 phone-frame examples expose no heading at all, because the TopNavigation bar title is a div. Tab roots such as Home, Projects, Chats, Inbox, My tasks, Files, Explore, Tasks and Orders use a compact title with no largeTitle. Only 6 start at h1.
 - TopNavigation unmounts the large-title h1 on collapse (TopNavigation.tsx:111/155), so a scrolled master screen, including typography/'Master screen · phone', has zero headings.
 - top-navigation/'Home with avatar': a root screen with an h2 Heading/2 large title (25px) and no h1.
 - typography/'Child screen · phone': no h1, and sibling h2s in Heading/4 ('Arriving Friday') and Heading/Subheading ('Items', 'Delivery address').
 - typography/'Master screen · phone': h2 'Pinned' is 12px/600 in the base tone over 14px Strongest rows. It passes the quality check only because the region's most common body size is 12px (captions plus the readout) and the tone check misreads content-neutral-base as content-on-*.
 - typography/'Master page · desktop' and templates/Dashboard: Display/4 values ('12', '4', '$48.2K', '1,284', '2.1%', '54') at 32px are larger than the 28px h1.
 - Row titles: 'Annual leave · 3 days' on the Master page renders Body/Base/Bold (14/600), not the ladder's Body/Base/Medium.
 - Mixed styles at the same level: typography/'Child screen', templates/Dashboard (h2 Subheading ChartCard + h2 Heading/4 sections), templates/'Mobile detail' (h2 Heading/3 + h2 Heading/4) and chart/'No data yet'.
 - chart/'No data yet': h3 Heading/Subheading 18px 'Weekly sign-ups', then h3 Heading/4 20px 'No data yet' (EmptyState larger than the card title it sits in).
 - Overlay titles, measured open: dialog h2 Heading/3 22px, modal-form h2 Heading/2 25px, side-panel modal h2 Heading/4 20px. BottomSheet is h2 Heading/3 (22px; 26px in Mobile mode).
 - 45 regions start at h3/h4 with no h1 or h2 above. Page-like ones include the Sidebar shells (h4 Heading/3 'Home' → h5 Heading/4), layout/'Title and actions row' (h3 Heading/3 'Team members'), Form sign-up (h4 Heading/3) and Mobile checkout (h4 Subheading).
 - Across 339 regions, h2 renders in 6 styles (Heading/4 ×13, Subheading ×8, Body/Small/Bold ×2, Heading/3 ×2, Heading/1 ×1, Heading/2 ×1) and h3 in 7. Heading/3 is the most common page-title style in examples (8×), although the ladder doesn't list it.
 - Flat headings: menu/'Composed items' h3 'My files' 14px/600 over 'Launch plan.docx' 14px/600; description-list/'Long values' h4 'Balance' 14px/600 over 'Available credit' 14px/600.
 - Heading-styled non-headings in core components: Accordion titles (Subheading/Heading/4/Heading/3 in a button, no heading element), Table caption Heading/4 on <caption>, MetricWidget large value Heading/1, AiChat greeting h2 in Heading/1. The Accordion rhythm findings are baselined (quality-baseline.
 - Docs: AGENTS.consumer.md:104 shows the forbidden h1 Heading/3; docs/figma-audit.md:225-229 has a stale type table.
 - None of the above fails npm run qa. audit.mjs --quality on typography, list-item, templates, chart and text reported no hierarchy or outline errors.

## Decisions for the user
 - 1. 'h1 = Heading/1' (your rule). This choice decides most of the phone problems. Option A, narrow it: 'the page title shown large (PageHeader, phone large title) is Heading/1; a compact app bar's h1 keeps the bar style'. This matches Apple (nav-bar title is a header), React Navigation (bar title role=heading level 1), Material, Spectrum, Fluent, Primer and Carbon, none of which tie h1 to one size. It lets the phone child screen and the collapsed master screen keep a real h1, and it changes no font size. Option B, keep it literal: phone child screens and collapsed screens get a visually hidden 
 - 2. 'Never change font sizes' (your rule) versus weak steps in Dashboard mode. Section h2 Heading/4 (20) and card h3 Heading/Subheading (18) differ by 1.11× at the same weight and tone; Body/Small vs Caption is 1.09×. Without resizing, you can: (a) keep the styles and separate levels by spacing and containment (Apple and Butterick put space first); or (b) move card and widget titles down to an existing smaller style, Body/Extra/Bold (16), as Polaris, Carbon and Atlassian do with 13–16px container titles. (b) gives a clearer section→card step but departs from the Figma ◆ templates that use Subhe
 - 3. Row title default: Bold (what the Figma ListItem and the component draw) or Medium (the ladder). With Bold, unread needs a second cue (dot or Badge plus a visually hidden 'Unread'). With Medium, the ListItem component and possibly Figma change. Either way, the unread state must also be stated in text (WCAG 1.3.1 via G117).
 - 4. List group header tone and role: base tone as a kicker label (the ladder; Apple, Fluent and Primer use subdued group labels) or Strongest (example-patterns.md, Atlassian's heading-colour rule). Also: should group labels inside menus, popovers and listboxes stop being headings (Primer, Spectrum S2), keeping headings only for page-level list groups?
 - 5a. Overlay title level: keep h2-only (then remove headingLevel 1 from Dialog, ModalForm and SidePanel), or allow h1 for modals (Primer, Atlassian, SLDS, EUI; APG example since 2026-03, for a tooling reason). No standard decides it; h2 is fine as long as the API and the audit agree.
 - 5b. Overlay title style: follow Figma per component (ModalForm Heading/2 at 25px, near the 28px page h1; Dialog, BottomSheet and SidePanel Heading/3; SidePanel modal Heading/4) and list it, or unify on Heading/3. Unifying diverges from Figma.
 - 6. Values vs page title: accept Display/4 values being larger than the Heading/1 title (M3's Display role is larger than headlines by design), or limit Display/4 to one hero value per view and use Heading/2 or Heading/3 for values in card grids.
 - 7. Heading component defaults: realign level→style defaults with the ladder (2 → Heading/4, 3 → Subheading, 4 → Body/Extra/Bold). This changes the look of every <Heading level> without textStyle but no tokens. The alternative is to keep the defaults and require textStyle for levels 2 and up.
 - 8. Scope: per the scope lock, every fix above (TopNavigation h1, PlatformPhone mobile mode, audit and harness changes, component defaults, docs and memory cleanup) needs your approval. Unapproved items go to the HANDOFF Backlog.
