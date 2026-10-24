// Harness case kinds for the avatar-badge suites (tools/figma-contract/suites). cases.tsx merges every group's kinds.
import type { ReactNode } from "react";
import { Avatar, AvatarStack, AvatarStatus } from "../../../src/components/Avatar";
import { Badge, BadgeCounter } from "../../../src/components/Badge";

type Props = Record<string, any>;
const photo = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#c8a"/></svg>');

export const cases: Record<string, (props: Props) => ReactNode> = {
  // Avatar/Single and its Status primitive: `label` is the initials (Figma's Label text); the Photo theme gets a picture.
  avatarBadgeAvatar: ({ label, ...p }) => <Avatar {...p} src={p.theme === "photo" ? photo : undefined}>{label}</Avatar>,
  // .Primitives/Avatar/Status on its own (AvatarStatus), every Size × Status.
  avatarBadgeStatus: (p) => <AvatarStatus {...p} />,
  // Avatar/Stack: `items` carry each instance's theme and initials, read from the variant; `more` is the suite's own flag.
  avatarBadgeStack: ({ more, ...p }) => <AvatarStack items={[]} {...p} />,
  // Badge: the label sits in its own span so the text's start (Text-Wrapper padding) can be measured.
  avatarBadgeBadge: ({ label, ...p }) => <Badge {...p}><span className="zen-figma-case-label">{label}</span></Badge>,
  avatarBadgeCounter: (p) => <BadgeCounter {...p} />,
};
