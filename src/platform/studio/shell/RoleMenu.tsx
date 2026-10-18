import { useState } from "react";
import { Avatar, avatarThemes, type AvatarTheme } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Menu, MenuGroup } from "../../../components/Menu";
import { PopoverItem } from "../../../components/Popover";
import { useAuthUser } from "../../auth/pocketbase";
import { studioStore, useStudio } from "../store";
import type { StudioRole } from "../types";
import "./shell.css";

const roles: Record<StudioRole, { label: string; caption: string }> = {
  // Figma's permission words (Can edit / Can view); the role keys stay admin / viewer.
  admin: { label: "Can edit", caption: "Change pages and save code" },
  viewer: { label: "Can view", caption: "View only" },
};

/**
 * Account menu: the current role (Admin edits source through the dev server, Viewer only inspects). A pick-one list:
 * radio items, the current role checked (not disabled, so it never reads as unavailable).
 */
/** A person's own hue for their initial (user, 2026-10-15: "dùng màu"), the same on every load: picked from the Avatar
 *  hues by their id, as Figma gives each collaborator a colour. */
const PERSON_HUES = avatarThemes.filter((theme) => theme !== "photo" && theme !== "neutral" && theme !== "accent");
function hueOf(key: string): AvatarTheme {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return PERSON_HUES[hash % PERSON_HUES.length];
}

export function RoleMenu() {
  const role = useStudio((state) => state.role);
  const user = useAuthUser();
  const initial = Array.from((user?.name || user?.email || "").trim())[0]?.toUpperCase() ?? "";
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
          // The avatar and the role, no chevron (user, 2026-10-15): the button reads as the person, as Figma UI3's avatar —
          // their photo, else their initial (2XSmall shows one letter), the person icon only when nobody is signed in.
          startIcon={(
            <Avatar size="2xs" theme={user?.avatarUrl ? "photo" : user ? hueOf(user.id || user.email) : "neutral"} background={user && !user.avatarUrl ? "solid" : "subtle"} src={user?.avatarUrl} alt="">
              {user?.avatarUrl ? undefined : initial || <Icon name="icon-user-line" size="xs" decorative />}
            </Avatar>
          )}
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
