import { useState } from "react";
import { Avatar, Button, Card, Form, FormActions, FormFieldset, Heading, InlineMessage, Rating, Stack, Text } from "@zen-ds/react";
import { initials, people } from "../../data";

const skills = [
  { id: "craft", label: "Visual craft" },
  { id: "interaction", label: "Interaction design" },
  { id: "communication", label: "Communication" },
  { id: "collaboration", label: "Collaboration" },
];
// Each star value has a word, so "4" reads the same to every interviewer.
const bar = ["", "Weak", "Below the bar", "Meets the bar", "Strong", "Exceptional"];
const candidate = { name: "Lan Hoang", theme: "indigo" as const, role: "Senior Product Designer" };

export default function InterviewScorecard() {
  const [scores, setScores] = useState<Record<string, number>>({ craft: 4, interaction: 5, communication: 0, collaboration: 0 });
  const [tried, setTried] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // A failed submit marks each unrated skill; Form then focuses the first one and announces how many are left.
  const submit = () => {
    setTried(true);
    if (skills.every((skill) => scores[skill.id])) setSubmitted(true);
  };
  // The whole card is the form: header, skills and actions take the Form's gap.
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Form onSubmit={submit}>
        <Stack direction="row" gap="sm" align="center">
          {/* A person without a photo: solid initials on their steady theme. */}
          <Avatar size="md" theme={candidate.theme} alt="">{initials(candidate.name)}</Avatar>
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">{candidate.name}</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">{candidate.role} · Portfolio review</Text>
          </Stack>
        </Stack>
        {submitted ? (
          <InlineMessage theme="positive" title="Scorecard submitted" action={{ label: "Edit scorecard", onClick: () => setSubmitted(false) }}>
            {people.minhAnh.name} shares the panel's scores on Friday.
          </InlineMessage>
        ) : (
          <>
            {/* Skills are stacked fields (md); each row wraps its stars under the name on a narrow card. */}
            <FormFieldset legend="Skills" gap="md">
              {skills.map((skill) => (
                // One fieldset per skill carries its own error; the visible name is its (hidden) legend's twin.
                <FormFieldset key={skill.id} legend={skill.label} hideLegend error={tried && !scores[skill.id] ? "Choose from 1 to 5 stars" : undefined}>
                  <Stack direction="row" justify="between" align="center" gap="sm" wrap>
                    <Text as="span" aria-hidden="true">{skill.label}</Text>
                    <Stack direction="row" gap="xs" align="center">
                      <Rating aria-label={skill.label} value={scores[skill.id]} onValueChange={(value) => setScores({ ...scores, [skill.id]: value })} />
                      {/* The word keeps one width (6.5rem follows the density's root size), so the stars line up row to row. */}
                      <Text as="span" textStyle="Body/Small/Regular" tone="base" style={{ width: "6.5rem" }}>{bar[scores[skill.id]]}</Text>
                    </Stack>
                  </Stack>
                </FormFieldset>
              ))}
            </FormFieldset>
            <FormActions>
              <Button level="primary" type="submit">Submit scorecard</Button>
            </FormActions>
          </>
        )}
      </Form>
    </Card></Stack>
  );
}
