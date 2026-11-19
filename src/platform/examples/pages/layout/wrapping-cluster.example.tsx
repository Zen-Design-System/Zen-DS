import { useId, useState } from "react";
import { Avatar, Button, Card, Heading, InputField, ModalForm, Stack, Tag, Text, useFormState, useToast } from "@zen-ds/react";
import { initials, people, type Person } from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

const chi = people.chi;
const chiSkills = ["Interaction design", "Prototyping", "Design systems", "Accessibility (WCAG 2.2)", "Usability testing", "Service blueprinting", "Figma", "Motion basics", "Workshop facilitation"];
const chiLanguages = ["Vietnamese", "English", "Japanese"];

export default function ProfileSkills() {
  const { toast } = useToast();
  const [skills, setSkills] = useState(chiSkills);
  const [adding, setAdding] = useState(false);
  const titleId = useId();
  const skillsId = useId();
  const languagesId = useId();
  const remove = (skill: string) => {
    const index = skills.indexOf(skill);
    setSkills((list) => list.filter((item) => item !== skill));
    toast({ title: "Skill removed", children: skill, action: { label: "Undo", onClick: () => setSkills((list) => (list.includes(skill) ? list : [...list.slice(0, index), skill, ...list.slice(index)])) } });
  };
  // Add skill asks for the skill: submitting checks it, closes, adds it and a toast confirms.
  const form = useFormState<{ skill: string }>({
    initialValues: { skill: "" },
    validate: ({ skill }) => ({ skill: skill.trim() ? undefined : "Enter a skill" }),
    onSubmit: ({ skill }, { reset }) => {
      const text = skill.trim();
      setSkills((list) => (list.includes(text) ? list : [...list, text]));
      setAdding(false);
      reset();
      toast({ type: "positive", title: "Skill added" });
    },
  });
  // Cancel, Escape and the scrim close the dialog and clear what was typed.
  const changeAdding = (open: boolean) => { setAdding(open); if (!open) form.reset(); };
  return (
    <Stack><Card as="section" theme="default" width="fill" maxWidth={440} alignSelf="center" aria-labelledby={titleId}>
      {/* Groups inside one surface lg apart; each kicker xs above its cluster. */}
      <Stack gap="lg">
        <Stack direction="row" gap="md" align="center">
          <Avatar size="lg" {...avatarOf(chi)} />
          <Stack gap="2xs">
            <Heading level={4} id={titleId} textStyle="Heading/Subheading">{chi.name}</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">{`${chi.role} · ${chi.location}`}</Text>
          </Stack>
        </Stack>
        {/* The editable cluster: its kicker, the Tags and its own Add skill, each xs apart. */}
        <Stack as="section" gap="xs" aria-labelledby={skillsId}>
          <Heading level={5} id={skillsId} textStyle="Body/Small/Bold" tone="light">Skills</Heading>
          {skills.length ? (
            // A row Stack with wrap: Tags flow onto as many lines as they need, 2xs apart across and down.
            <Stack as="ul" direction="row" gap="2xs" wrap aria-labelledby={skillsId}>
              {skills.map((skill) => <li key={skill}><Tag remove onRemove={() => remove(skill)}>{skill}</Tag></li>)}
            </Stack>
          ) : <Text textStyle="Body/Small/Regular" tone="base">No skills yet</Text>}
          <Button level="tertiary" startIcon="icon-plus-line" onClick={() => setAdding(true)}>Add skill</Button>
        </Stack>
        {/* Read-only facts stay plain text, so only the cluster that can change looks like Tags. */}
        <Stack as="section" gap="xs" aria-labelledby={languagesId}>
          <Heading level={5} id={languagesId} textStyle="Body/Small/Bold" tone="light">Languages</Heading>
          <Text>{chiLanguages.join(", ")}</Text>
        </Stack>
      </Stack>
      <ModalForm open={adding} onOpenChange={changeAdding} title="Add skill" onSubmit={form.handleSubmit}
        primaryAction={{ label: "Add skill" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Skill" type="text" autoComplete="off" placeholder="Content design" data-autofocus="" {...form.field("skill")} />
      </ModalForm>
    </Card></Stack>
  );
}
