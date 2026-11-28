import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { Avatar } from "../../../components/Avatar";
import { IconButton } from "../../../components/Button";
import { ModalForm } from "../../../components/Dialog";
import { Icon } from "../../../components/Icon";
import { InputField, SelectField } from "../../../components/Input";
import { Stack } from "../../../components/Layout";
import { Text } from "../../../components/Text";
import { useAuthUser } from "../../auth/pocketbase";
import { copyText } from "../inspector/frames";
import { useProject } from "../project/projectStore";
import { hueOf } from "../shell/RoleMenu";
import { ACCESS_LABELS, parseEmails, shareLink, sortMembers, type CloudAccess, type MemberRole } from "./collabModel";
import { cloudProjectOf, explain, inviteMembers, listMembers, refreshCollab, removeMember, setMemberRole, shareProject, useCollab, type Member } from "./collabStore";
import { closeShare, shareTarget, subscribeShare } from "./shareState";
import "./collab.css";

/*
 * Figma's Share dialog for a Studio project (GĐ 1, docs/research/studio-collaboration-plan-2026-11-07.md): invite people
 * by email as Can edit or Can view, change or remove them, copy the link. Two fields, so a ModalForm (forms-in-overlays).
 * The project's owner changes who is in it; members see the list. The server's rules decide (tools/studio/pocketbase):
 * every refusal comes back in words here. The first invite shares the project (its cloud copy).
 */

const ROLE_OPTIONS = [{ value: "editor", label: ACCESS_LABELS.editor }, { value: "viewer", label: ACCESS_LABELS.viewer }];

/** Why the dialog cannot share, in words (null: it can). */
function blockedBy(status: string, hasProject: boolean): string | null {
  if (!hasProject) return "Move this page into a project to share it. Pages in Drafts stay on this computer.";
  if (status === "signed-out") return "Sign in with Google to share this project.";
  if (status === "no-seat") return "Your account has no Zen Studio seat. Ask your team's admin for one to share projects.";
  if (status === "unavailable") return "Sharing isn't set up on this server yet.";
  if (status === "offline") return "Can't reach the sharing server. Check your connection.";
  return null;
}

export function ShareDialog() {
  const target = useSyncExternalStore(subscribeShare, shareTarget, shareTarget);
  const open = Boolean(target);
  const project = useProject(target?.project ?? null);
  const user = useAuthUser();
  const collab = useCollab();
  // A project of this Studio (yours, shared or not yet), or one shared with you (`shared-<id>`, no local copy in GĐ 1).
  const cloud = target?.project ? cloudProjectOf(target.project, collab.projects) : null;
  const access: CloudAccess | null = cloud?.access ?? (project ? "owner" : null);
  const name = project?.name ?? cloud?.name ?? null;
  const owner = access === "owner";
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<MemberRole>("editor");
  const [members, setMembers] = useState<Member[]>([]);
  const [note, setNote] = useState<{ tone: "base" | "negative"; text: string } | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const blocked = open ? blockedBy(collab.status, Boolean(name)) : null;

  // The members, read again when the dialog opens on a shared project.
  useEffect(() => {
    if (!open || !cloud || blocked) { setMembers([]); return; }
    let live = true;
    listMembers(cloud.id).then((list) => { if (live) setMembers(list); }, (error) => { if (live) setNote({ tone: "negative", text: explain(error).message }); });
    return () => { live = false; };
  }, [open, cloud?.id, blocked]);
  useEffect(() => { if (!open) { setEmails(""); setNote(null); setInvalid(null); } }, [open]);

  const reload = async (cloudId: string) => { setMembers(await listMembers(cloudId)); await refreshCollab(); };
  const invite = async (event: FormEvent) => {
    event.preventDefault();
    if (!project || blocked || !owner) return;
    const parsed = parseEmails(emails);
    if (!parsed.emails.length || parsed.invalid.length) {
      setInvalid(parsed.invalid.length ? `Not an email: ${parsed.invalid.join(", ")}` : "Type an email to invite someone.");
      return;
    }
    setInvalid(null);
    try {
      const shared = await shareProject(project);
      const { added, failed } = await inviteMembers(shared.id, parsed.emails, role);
      await reload(shared.id);
      setEmails(failed.map((item) => item.email).join(", "));
      setNote(failed.length
        ? { tone: "negative", text: failed.map((item) => `${item.email}: ${item.message}`).join(" · ") }
        : { tone: "base", text: `${added.length === 1 ? added[0] : `${added.length} people`} can ${role === "editor" ? "edit" : "view"} this project once they sign in.` });
    } catch (error) {
      setNote({ tone: "negative", text: explain(error).message });
    }
  };
  const change = async (member: Member, next: string) => {
    try {
      if (next === "remove") await removeMember(member.id);
      else await setMemberRole(member.id, next as MemberRole);
      if (cloud) await reload(cloud.id);
    } catch (error) {
      setNote({ tone: "negative", text: explain(error).message });
    }
  };

  const people = sortMembers([
    ...(name ? [{ id: "owner", email: cloud?.ownerEmail || user?.email || "", access: "owner" as CloudAccess }] : []),
    ...members.map((member) => ({ id: member.id, email: member.email, access: member.role as CloudAccess })),
  ]).filter((person) => person.email);
  const title = name ? `Share ${name}` : "Share";

  return (
    <ModalForm
      open={open}
      onOpenChange={(next) => { if (!next) closeShare(); }}
      title={title}
      description={blocked ?? (owner ? "People you invite sign in with Google. Only accounts with a Zen Studio seat can open the project." : `Shared by ${cloud?.ownerEmail ?? "its owner"}. Only the owner changes who is in it.`)}
      className="studio-share"
      onSubmit={owner && !blocked ? invite : undefined}
      primaryAction={owner && !blocked ? { label: "Invite" } : { label: "Done", onClick: closeShare }}
      secondaryAction={cloud && !blocked ? { label: "Copy link", level: "secondary", onClick: () => copyText(shareLink(window.location.origin, window.location.pathname, cloud.id), "the link") } : undefined}
    >
      {blocked ? null : (
        <>
          {owner ? (
            <Stack direction="row" gap="sm" align="end">
              <InputField
                label="Email"
                size="md"
                type="email"
                placeholder="name@company.com, …"
                autoComplete="off"
                value={emails}
                onValueChange={(value) => { setEmails(value); setInvalid(null); }}
                error={invalid ?? undefined}
                aria-invalid={invalid ? true : undefined}
                className="studio-share__emails"
              />
              <SelectField label="Role" size="md" value={role} options={ROLE_OPTIONS} onValueChange={(value) => setRole(value as MemberRole)} className="studio-share__role" />
            </Stack>
          ) : null}
          {note ? <Text as="p" textStyle="Body/Small/Regular" tone={note.tone === "negative" ? "negative" : "base"} role="status">{note.text}</Text> : null}
          <Stack gap="xs" as="ul" aria-label="People with access" className="studio-share__people">
            {people.map((person) => (
              <Stack key={person.id} as="li" direction="row" gap="sm" align="center" className="studio-share__person">
                <Avatar size="sm" theme={hueOf(person.email)} background="solid" alt="">{person.email}</Avatar>
                <Text as="span" textStyle="Body/Base/Regular" tone="strongest" className="studio-share__email" title={person.email}>
                  {person.email}{person.email === user?.email ? " (you)" : ""}
                </Text>
                {person.access === "owner" || !owner ? (
                  <Text as="span" textStyle="Body/Small/Regular" tone="light">{ACCESS_LABELS[person.access]}</Text>
                ) : (
                  <>
                    <SelectField aria-label={`Role of ${person.email}`} size="sm" value={person.access} options={ROLE_OPTIONS} onValueChange={(value) => void change(members.find((member) => member.id === person.id)!, value)} className="studio-share__member-role" />
                    <IconButton appearance="flat" level="secondary" size="sm" aria-label={`Remove ${person.email}`} tooltip="Remove" icon={<Icon name="icon-x-line" />} onClick={() => void change(members.find((member) => member.id === person.id)!, "remove")} />
                  </>
                )}
              </Stack>
            ))}
          </Stack>
        </>
      )}
    </ModalForm>
  );
}
