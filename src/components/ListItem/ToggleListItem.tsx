import { useId, type HTMLAttributes, type ReactNode, type Ref } from "react";
import type { IconName } from "../Icon";
import { ToggleButton, type ToggleSize } from "../Toggle";
import { renderIcon } from "../_shared/icon";
import { typographyStyles } from "../../tokens/typography.generated";
import "./list-item.css";

/** Standard HTML attributes (`id`, `data-*`, `aria-*`, `style`…) go to the root row element (`as`). */
export interface ToggleListItemProps extends Omit<HTMLAttributes<HTMLElement>, "title" | "onChange"> {
  /** The root row element. */
  ref?: Ref<HTMLElement>;
  /** What the switch turns on or off (Body/Base/Bold, one line); it names the switch. */
  title: ReactNode;
  /** One line under the title (Body/Small/Regular, Content/Neutral/Base): what the setting does. It describes the switch. */
  caption?: ReactNode;
  /** Icon name or element before the text, as in ListItem. */
  leading?: IconName | ReactNode;
  /** Controlled on/off state. */
  checked?: boolean;
  /** Initial state when uncontrolled. Default false. */
  defaultChecked?: boolean;
  /** Called with the new state on a press anywhere on the row, or Space / Enter on the switch. */
  onCheckedChange?: (checked: boolean) => void;
  /** The row and its switch do nothing; the switch shows Disabled. */
  disabled?: boolean;
  /** Toggle-Button size. Default md. */
  toggleSize?: ToggleSize;
  /** Form field name of the switch's checkbox (submitted as "on" while checked). */
  name?: string;
  /** Root element. Default `li` (inside a List); `div` outside one. */
  as?: "li" | "div";
  className?: string;
}

/**
 * A settings row whose whole surface is one switch: a ListItem (leading, Title, Caption) with a Toggle-Button
 * (Toggle/Toggle-Button) in its trailing slot. Composed from the Figma List-Item and Toggle-Button primitives with
 * their own tokens — no Figma master of its own yet (backlog batch 6, user 2026-10-07). A press anywhere on the row
 * flips the switch (the row is a <label> around it); the switch keeps the focus ring and Space / Enter (APG Switch).
 */
export function ToggleListItem({ ref, title, caption, leading, checked, defaultChecked, onCheckedChange, disabled = false, toggleSize = "md", name, as: Tag = "li", className, ...rest }: ToggleListItemProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const captionId = caption ? `${id}-caption` : undefined;
  return (
    <Tag {...rest} ref={ref as Ref<HTMLDivElement & HTMLLIElement>} className={["zen-list-item", "zen-toggle-list-item", className].filter(Boolean).join(" ")} data-interactive={disabled ? undefined : "true"} data-disabled={disabled ? "true" : undefined}>
      <label className="zen-list-item__wrapper">
        {leading ? <span className="zen-list-item__leading">{renderIcon(leading)}</span> : null}
        <span className="zen-list-item__contents">
          <span id={titleId} className={`zen-list-item__title ${typographyStyles["Body/Base/Bold"]}`}>{title}</span>
          {caption ? <span id={captionId} className={`zen-list-item__caption ${typographyStyles["Body/Small/Regular"]}`}>{caption}</span> : null}
        </span>
        <span className="zen-list-item__trailing">
          <ToggleButton checked={checked} defaultChecked={defaultChecked} onCheckedChange={onCheckedChange} disabled={disabled} size={toggleSize} name={name} aria-labelledby={titleId} aria-describedby={captionId} />
        </span>
      </label>
    </Tag>
  );
}
