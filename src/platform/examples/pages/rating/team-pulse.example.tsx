import { useState } from "react";
import { Button, Card, Form, FormActions, Heading, InlineMessage, OpinionScale, Stack, Text, TextAreaField, type OpinionEmotion } from "@zen-ds/react";
import { people } from "../../data";

export default function TeamPulse() {
  const [mood, setMood] = useState<OpinionEmotion | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const low = mood === "disappointed";
  // On a narrow card the faces keep one row and drop their labels.
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Form onSubmit={() => setSent(true)}>
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">How was this week's design critique?</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Answers are anonymous. {people.minhAnh.name} reads them on Friday.</Text>
        </Stack>
        {sent ? (
          <InlineMessage theme="positive" title="Answer sent" action={{ label: "Change answer", onClick: () => setSent(false) }}>
            Thanks. Next week's critique is on Tuesday at 2:00 pm.
          </InlineMessage>
        ) : (
          <>
            <OpinionScale scale={3} aria-label="How was this week's design critique?" value={mood} onValueChange={setMood} />
            {low ? <TextAreaField label="What would make it better" labelOptional rows={2} value={note} onValueChange={setNote} /> : null}
            {mood ? (
              <FormActions>
                <Button level="primary" type="submit">Send answer</Button>
              </FormActions>
            ) : null}
          </>
        )}
      </Form>
    </Card></Stack>
  );
}
