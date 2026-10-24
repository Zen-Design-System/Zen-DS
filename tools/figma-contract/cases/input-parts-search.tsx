// Harness case kinds for the input-parts-search suites (tools/figma-contract/suites). cases.tsx merges every group's kinds.
import type { ReactNode } from "react";
import { ControlBarSelectItem, InputConditionItem, InputConditions, InputContent, InputHelpText, InputLabel, InputLeadingTrailing, TextAreaField } from "../../../src/components/Input";
import { Search } from "../../../src/components/Search";
import { Divider } from "../../../src/components/Divider";
import { Flag } from "../../../src/components/Flag";
import { ChatComposer } from "../../../src/components/Chat";

type Props = Record<string, any>;
export const cases: Record<string, (props: Props) => ReactNode> = {
  // .Primitives/Input/Help-Text fills a 185.75px frame; `limit` also shows the Character-Limitation text.
  ipsHelpText: ({ theme, limit }) => (
    <div style={{ width: 185.75 }}><InputHelpText theme={theme} characterLimit={limit ? "0/100" : undefined}>Message text</InputHelpText></div>
  ),
  // Condition-Item is 320px wide; it renders inside its list (the <li> needs a <ul>), measured from the item.
  ipsConditionItem: ({ state, label }) => (
    <div style={{ width: 320 }}><InputConditions><InputConditionItem state={state} label={label} /></InputConditions></div>
  ),
  ipsConditions: ({ items }) => (
    <div style={{ width: 320 }}><InputConditions>{items.map((label: string, index: number) => <InputConditionItem key={index} label={label} />)}</InputConditions></div>
  ),
  // .Primitives/Input/Leading-Trailing: the decorative slot (no picker, no action), icon-user-circle-line or the Vietnam flag.
  ipsLeadingTrailing: ({ icon, flag, label, ...p }) => (
    <InputLeadingTrailing {...p} icon={icon ? "icon-user-circle-line" : undefined} flag={flag ? <Flag name="Vietnam" /> : undefined} label={label ? "VN" : undefined} />
  ),
  // Primitives/Input/Label fills a 536px frame; `extras` shows Optional, the tooltip icon and an Action.
  ipsLabel: ({ disabled, extras }) => (
    <div style={{ width: 536 }}>
      <InputLabel disabled={disabled} optional={extras} tooltip={extras} action={extras ? <button type="button">Action</button> : undefined}>Label</InputLabel>
    </div>
  ),
  // .Primitives/Input/Cursor: Default is the caret of InputContent (Focused); Accent the Chat composer's caret.
  ipsCursor: ({ theme }) => (theme === "accent"
    ? <div style={{ width: 360 }}><ChatComposer onSend={() => {}} device="desktop" /></div>
    : <InputContent state="focused" text="" />),
  // .Primitives/Input/Text-Area is the box of TextAreaField (no label or help text) in a 400px frame.
  ipsTextArea: (p) => <div style={{ width: 400 }}><TextAreaField aria-label="Text" placeholder="Placeholder" onChange={() => {}} {...p} /></div>,
  ipsSelectItem: (p) => <ControlBarSelectItem {...p} icon="icon-star-93-line" aria-label="Star" />,
  // Search/Default fills a 249.6px frame, Search/Popover 241.6px.
  ipsSearch: ({ width, ...p }) => <div style={{ width }}><Search onChange={() => {}} {...p} /></div>,
  ipsDivider: (p) => <div style={{ width: 356 }}><Divider {...p} /></div>,
};
