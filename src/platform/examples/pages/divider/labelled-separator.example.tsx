import { useId, useRef, useState } from "react";
import { Button, Card, Divider, Form, FormActions, Heading, InputField, Stack, Text, useToast } from "@zen-ds/react";
import { studio } from "../../data";

/** A labelled separator: the word sits between two decorative lines. */
export default function SignIn() {
  const { toast } = useToast();
  const titleId = useId();
  const againRef = useRef<HTMLButtonElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState("");
  const submit = () => {
    const value = email.trim();
    // Form moves focus to the field once the error renders.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) { setError("Enter an email address like name@company.com"); return; }
    setError(undefined);
    setSentTo(value);
    setTimeout(() => againRef.current?.focus());
  };
  return (
    <Card theme="default">
      {sentTo ? (
        // The sent state replaces the form: what happened, then the one way back.
        <Stack gap="md">
          <Stack gap="xs" role="status">
            <Heading level={4} textStyle="Heading/Subheading">Check your inbox</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">{`We sent a sign-in link to ${sentTo}. It works for 15 minutes.`}</Text>
          </Stack>
          {/* The form comes back in its place, so focus goes to its empty field, not to <body>. */}
          <Button ref={againRef} level="tertiary" onClick={() => { setSentTo(""); setEmail(""); setTimeout(() => emailRef.current?.focus()); }}>Use another email</Button>
        </Stack>
      ) : (
        <Form onSubmit={submit} gap="md" aria-labelledby={titleId}>
          <Stack gap="xs">
            <Heading level={4} id={titleId} textStyle="Heading/Subheading">{`Sign in to ${studio.name}`}</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">Studio staff use SSO; clients sign in with the email we invited.</Text>
          </Stack>
          {/* SSO spans the card like the stacked email action under the field. */}
          <Stack align="stretch">
            <Button level="tertiary" size="lg" startIcon="icon-key-line" onClick={() => toast({ title: "SSO window opened", children: "Finish signing in with your studio account." })}>Continue with SSO</Button>
          </Stack>
          <Stack direction="row" gap="xs">
            <Divider decorative />
            <Text as="span" textStyle="Body/Small/Regular" tone="base">or</Text>
            <Divider decorative />
          </Stack>
          <InputField ref={emailRef} label="Email" type="email" autoComplete="email" value={email} onValueChange={setEmail} error={error} />
          {/* In a card narrower than 480px FormActions stacks its button full width, Large. */}
          <FormActions><Button level="primary" type="submit">Continue with email</Button></FormActions>
        </Form>
      )}
    </Card>
  );
}
