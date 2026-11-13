import { useState } from "react";
import { Button, Card, Form, FormActions, Heading, InlineMessage, NpsScale, Stack, TextAreaField } from "@zen-ds/react";

/** The follow-up question follows the score: what to fix, what would make it a 10, or what works. */
const followUp = (score: number) =>
  score <= 6 ? "What should we fix first" : score <= 8 ? "What would make Zen a 10" : "What do you like most about Zen";

export default function NpsSurvey() {
  const [score, setScore] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Form onSubmit={() => setSent(true)}>
        <Heading level={4} textStyle="Heading/Subheading">How likely are you to recommend Zen?</Heading>
        {sent && score !== null ? (
          <InlineMessage theme="positive" title={`You answered ${score} out of 10`} action={{ label: "Change answer", onClick: () => setSent(false) }}>
            The product team reads every answer.
          </InlineMessage>
        ) : (
          <>
            <NpsScale scale={10} aria-label="How likely are you to recommend Zen?" lowLabel="Not likely" highLabel="Very likely"
              value={score} onValueChange={setScore} />
            {score !== null ? (
              <>
                <TextAreaField label={followUp(score)} labelOptional rows={2} value={reason} onValueChange={setReason} />
                <FormActions>
                  <Button level="primary" type="submit">Send feedback</Button>
                </FormActions>
              </>
            ) : null}
          </>
        )}
      </Form>
    </Card></Stack>
  );
}
