# AppShell rebuild on the Figma patterns (2026-10-19)

The user's decision (2026-10-19): "đập appshell hiện có ra làm lại từ đầu", then **"Phá hẳn, migrate hết"**. The code
AppShell is rewritten from the Figma patterns. No deprecated aliases are kept (an exception to AGENTS §B that the user
made), and every consumer is migrated in the same change. After that, the screen examples and `src/templates` are rebuilt
on it: "phải có context và độ chi tiết và hoàn thiện cao".

## Source (live file `9nZv4uW2LT21yuHabMTCh1`, ◇ Master-Layout section 16254:1057)

| Figma | Node | Properties |
| --- | --- | --- |
| Pattern/AppShell/Desktop | 16258:1857 | Layout Sidebar · Top-Bar · List-Detail · Workspace · Docs · Focus × Collapse Header · Sidebar · None; booleans Sidebar, Side-Panel, Floating-Actions, Leading-Pane, Trailing-Pane, Progress, Status-Bar; slot Content |
| Pattern/AppShell/Mobile | 16261:136204 | Device Phone · Tablet × Top Bar · Band · Band-Sheet · Media × Bottom Tab-Bar · Floating · Actions · None; booleans Top-Navigation, Floating-Actions; slots Content, Hero, Backdrop |
| Pattern/AppShell/Duo | 16288:7247 | Display Inner · Outer · Inner-Portrait; Leading-Pane, Fold. A Studio device (DeviceBars); in code a Duo is a tablet. |
| .Primitives/AppShell/Pane | 16254:1099 | Theme Shadow · Flat · Border · Pale · Subtle · On-Container · Canvas × Surface Default · Alt · Flat (10 combinations); Header, Action, Title |
| Header/AppShell | 16243:290461 | Collapse Button, Top-Header, Main booleans; slots Top-Elements, Main-Element, Sections |
| Action-Bar/Mobile | 16326:6489 | Type Default · Glass; Home-Indicator |
| Top-Navigation/Mobile | 12014:45167 | Type adds Transparent and Transparent-On-Color, which code lacks |

## Anatomy (tokens read from the nodes)

### Desktop (shell ≥ 1024: desktop and iPad landscape)

| Layout | Structure |
| --- | --- |
| Sidebar | Sidebar (Expand) · Main-Container [Header · Body] · Side-Panel (Standard, Small 360) |
| List-Detail | Sidebar rail (Expand=No, 80) · Leading-Pane wrapper (padding XSmall top/bottom/start; Pane 360, Shadow) · Main-Container [Header · Body] · Side-Panel |
| Top-Bar | Main-Container [Header · Body] across the width · Side-Panel |
| Workspace | Top-Bar (Header, Top-Header only, 72) across · Work [Leading-Pane (padding XSmall bottom/start; Pane Sidebar/Default-Width, Shadow) · Body · Trailing-Pane (XSmall bottom/end; same width)] |
| Docs | as Workspace, panes Theme=Canvas; the Main-Container centres a Column max 720 |
| Focus | Top-Bar · Progress row (centred Stepper bar) · Body (row, gap Large, centred): Column max 680 + Trailing-Pane 376 × hug (Shadow) |

- **Root:** Canvas/Default fill.
- **Body:** padding Margin-Comfortable on all sides, gap Gap/XSmall; it scrolls.
- **Header (Header/AppShell):** Main frame with padding Margin-Comfortable top and sides, XSmall at the bottom, and gap Medium. It holds:
  - the Top-Header row, Gap/Medium: the collapse Wrapper (20, Icon-Flat Small Primary), then Top-Elements (Leading-Slots: Breadcrumbs Small; Center-Slots ≤ 400; Trailing-Slots, Gap/Small: Action-Items, Avatar Medium);
  - the Main-Element row (Gap/Small).
  - Under the Main frame sits the Sections slot.
- **Pane:**
  - Fill and effect by Theme:
    - Shadow: Surface + Shadow/Bottom/Level-1.
    - Flat: Surface (or Alt).
    - Border: Surface, Alt or Flat, with Border/Neutral/Pale.
    - Pale: Support/Neutral/Pale + Effect/Overlay.
    - Subtle: Support/Neutral/Subtle + Effect/Overlay.
    - On-Container: Surface/Flat.
    - Canvas: no fill.
  - Radius Corner-Radius/XLarge.
  - Pane-Header: padding Margin-Compact on the top and sides, XSmall at the bottom; gap XSmall; centred. It holds the Title (Heading/3, Neutral/Strongest, one line, ending "…") and the Action (an Icon-Flat Small Secondary in a 20 Wrapper).
  - Pane-Content: padding XSmall, gap XSmall.

### Mobile (shell < 1024 with mobile parts: phones and iPad portrait)

| Top | Structure |
| --- | --- |
| Bar | Top-Navigation (Type=Alt, Surface/Alt) · Body (padding XSmall · Margin-Comfortable · Large · Margin-Comfortable; content gap Layout-Mobile/Section-Gap) |
| Band | Band (Support/Brand/Subtle, bottom radius 2XLarge) [Top-Navigation Transparent · Hero (padding XSmall · Margin · XLarge · Margin, gap XSmall)] · Body (top padding XLarge) |
| Band-Sheet | Root Surface · Stage (Support/Brand/Subtle) [Top-Navigation Transparent · Hero · Sheet (Surface, top radius 3XLarge, padding XLarge · Margin · Large · Margin) to the bottom] |
| Media | Root Surface · Stage [Backdrop slot 520 behind (absolute) · Top-Navigation Liquid-Overlay · spacer · Sheet (as Band-Sheet)] |

| Bottom | Part |
| --- | --- |
| Tab-Bar | Bottom-Navigation/Mobile/Default (84) |
| Floating | Bottom-Navigation Floating-Glass over the page (absolute); Body bottom padding Gap/XGiant (88) |
| Actions | Action-Bar/Mobile (padding Small · Margin · 0 · Margin, Surface + Border/Neutral/Subtle top; Glass: 20% gradient Inverse/Flat → Surface, progressive blur 24) with the home indicator |
| None | System/Bottom-Indicator (padding Medium · Margin · XSmall · Margin) |

Floating-Actions: absolute bottom-right, padding Margin-Comfortable, Shadow/Bottom/Level-2, items 56.

## New API

```tsx
<AppShell
  pattern="sidebar" // sidebar | list-detail | top-bar | workspace | docs | focus (Figma Layout, desktop)
  collapse="header" // header | sidebar | none (Figma Collapse: where the Sidebar's toggle sits)
  sidebar={<Sidebar … />}
  header={<AppShellHeader leading={<Breadcrumbs …/>} center={…} actions={<>…<AppShellAccount …/></>} main={<PageHeader …/>} sections={<Tabs …/>} />}
  leadingPane={<AppShellPane title="Inbox" theme="shadow">…</AppShellPane>}
  trailingPane={<AppShellPane …/>}
  sidePanel={<SidePanel type="standard" …/>}
  progress={<Stepper …/>}
  floatingActions={…}
  banner={<AlertBanner …/>}
  canvas="default"
  // mobile (Pattern/AppShell/Mobile)
  mobileTop="bar" // bar | band | band-sheet | media (Figma Top)
  topNavigation={<TopNavigation …/>}
  hero={…}
  backdrop={…}
  bottomNavigation={<BottomNavigation type="default | floating-glass" …/>} // Bottom Tab-Bar | Floating
  actionBar={<ActionBar surface="default | glass" …/>} // Bottom Actions
  layout="auto" // auto | desktop | drawer | mobile
>
  {page content: the Body (Figma Content)}
</AppShell>
```

- **Kept, as concepts and not as aliases:**
  - sidebar rail state: `sidebarCollapsed`, `defaultSidebarCollapsed`, `onSidebarCollapsedChange`;
  - drawer: `navOpen`, `defaultNavOpen`, `onNavOpenChange`, `navLabel`;
  - `mainId`, `useAppShell()`, `AppShellAction`, `AppShellAccount`;
  - the skip link, the modal drawer and the focus rules.
- **Removed:**
  - `header` / `headerCenter` / `headerActions` / `sections` become `AppShellHeader`;
  - `aside` becomes `sidePanel`;
  - `floatingAction` becomes `floatingActions`;
  - `footer` becomes `actionBar`;
  - `sidebarToggle` becomes `collapse`;
  - `layout` values `sidebar` / `phone` become `desktop` / `mobile`.
- **Mobile below 1024** when any mobile part is given: iPad portrait uses the mobile shell (the user, 2026-10-18). Otherwise the shell keeps the drawer with a top bar.
- **Body padding:** the Body pads Margin-Comfortable as in Figma, so pages no longer wrap their content in `<Container>` for the shell's margins.

## Migration (one PR, or a stack that lands together)

1. **Library:**
   - AppShell, new AppShellHeader and AppShellPane;
   - ActionBar `glass`, TopNavigation `transparent` and `transparent-on-color`;
   - stories, guideline source, harness rules (`collapse-beside-master-crumb`, equal panes, pattern parts), Figma contract.
2. **Consumers:**
   - `src/templates` (+hr), `src/platform/appLayer`, the platform examples;
   - usage-guard rules and fixtures, ai-ui, mcp, figma-docs, platform-audit, tests;
   - `docs/component-usage-rules.md` §17, `AGENTS.consumer.md`.
3. **Studio:**
   - Screen master layout (`builder/proto/runtime.tsx`), dialect SCREEN_CHROME, slots registry, select, starters;
   - push/pull maps;
   - the inspector Screen section (session B's area: announce first);
   - E2E;
   - a migration of saved `.zen-studio` pages.
4. **Rebuild:** the ~59 screen examples and the templates, each with a real context (product, people, data, states) and a high finish, through the gate page by page.
