import { useState } from "react";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Menu, MenuGroup } from "../../../components/Menu";
import { PopoverItem } from "../../../components/Popover";
import { studioStore, useStudio } from "../store";
import type { StudioRole } from "../types";
import "./shell.css";

const roles: Record<StudioRole, { label: string; caption: string }> = {
  admin: { label: "Admin", caption: "Can edit source" },
  viewer: { label: "Viewer", caption: "View only" },
};

/**
 * Account menu: the current role (Admin edits source through the dev server, Viewer only inspects). A pick-one list:
 * radio items, the current role checked (not disabled, so it never reads as unavailable).
 */
export function RoleMenu() {
  const role = useStudio((state) => state.role);
  const [open, setOpen] = useState(false);
  return (
    <Menu
      aria-label="Role"
      align="end"
      open={open}
      onOpenChange={setOpen}
      trigger={(
        <Button
          className="studio-role"
          appearance="flat"
          level="primary"
          size="sm"
          aria-label={`Role: ${roles[role].label}`}
          startIcon={<Avatar size="2xs" theme="neutral" background="subtle" alt=""><Icon name="icon-user-line" size="xs" decorative /></Avatar>}
          endIcon={<Icon name="icon-chevron-down-line" decorative />}
        >
          <Badge size="sm" theme={role === "admin" ? "accent" : "neutral"} background="subtle" leadingIcon={false}>{roles[role].label}</Badge>
        </Button>
      )}
    >
      <MenuGroup label="Role">
        {(Object.keys(roles) as StudioRole[]).map((id) => (
          <PopoverItem
            key={id}
            itemRole="menuitemradio"
            tabIndex={-1}
            className="zen-menu__item"
            label={roles[id].label}
            caption={roles[id].caption}
            leading={<Icon name={id === "admin" ? "icon-edit-02-line" : "icon-eye-line"} size="base" decorative />}
            selected={id === role}
            onSelect={() => { studioStore.setState({ role: id }); setOpen(false); }}
          />
        ))}
      </MenuGroup>
    </Menu>
  );
}
