import { Avatar } from "../components/Avatar";
import { ChatAvatarGroup, type ChatPerson } from "../components/Chat";
import { TopNavigation } from "../components/TopNavigation";

/**
 * The ◆ Social conversation header (Figma 6353:69678), shared by the mobile chat playground and examples:
 * Top-Navigation Type=Default · Margin=Compact — a Tertiary back chevron, the identity (48px Avatar or ChatAvatarGroup
 * Large + name in Body/Extra/Bold + presence in Caption/Regular) and one Tertiary pill holding audio + video call.
 */
export function PlatformChatHeader({ title, subtitle, person, group, online = false, onAction }: {
  title: string;
  subtitle?: string;
  person?: ChatPerson;
  group?: ChatPerson[];
  online?: boolean;
  /** Receives a short description of what was tapped (the demos surface it as a note). */
  onAction: (what: string) => () => void;
}) {
  const leading = group?.length
    ? <ChatAvatarGroup people={group} size="large" online={online} />
    : person
      ? <Avatar size="large" theme={person.src ? "photo" : person.theme ?? "neutral"} background="subtle" src={person.src} alt="" status={online}>{person.src ? null : person.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</Avatar>
      : undefined;
  return (
    <TopNavigation margin="compact" title={title} subtitle={subtitle ?? (online ? "Active now" : undefined)} titleLeading={leading}
      onTitleClick={onAction(`Open ${title} details`)} titleLabel={`${title}${subtitle ? `, ${subtitle}` : online ? ", active now" : ""}. Open details`}
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: onAction("Back to conversations") }}
      trailing={[{ icon: "icon-phone-line", label: "Audio call", group: "call", onClick: onAction(`Calling ${title}`) }, { icon: "icon-video-recorder-line", label: "Video call", group: "call", onClick: onAction(`Starting a video call with ${title}`) }]} />
  );
}
