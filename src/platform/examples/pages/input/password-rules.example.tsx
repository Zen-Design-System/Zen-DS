import { useRef, useState, type FormEvent } from "react";
import { Button, Card, Form, FormActions, Heading, InlineMessage, InputConditionItem, InputConditions, InputField, InputLeadingTrailing, Stack, Text } from "@zen-ds/react";

const passwordRules = [
  { label: "At least 10 characters", test: (v: string) => v.length >= 10 },
  { label: "An uppercase and a lowercase letter", test: (v: string) => /[A-Z]/.test(v) && /[a-z]/.test(v) },
  { label: "A number", test: (v: string) => /\d/.test(v) },
  { label: "Not your name or email", test: (v: string) => v.length > 0 && !/pham|em@dizai/i.test(v) },
];

/** The rules sit under the field as Input Conditions and turn to a check or a cross while typing. */
export default function PasswordRules() {
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState(false);
  const passes = passwordRules.every((rule) => rule.test(password));
  // The form and the message replace each other: focus follows to the message or back to the field, not to the page.
  const fieldRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLSpanElement>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTried(true);
    if (!passes) return;
    setDone(true);
    setTimeout(() => doneRef.current?.focus());
  };
  const again = () => {
    setPassword("");
    setTried(false);
    setShown(false);
    setDone(false);
    setTimeout(() => fieldRef.current?.focus());
  };
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      {done ? (
        <InlineMessage theme="positive" title={<span ref={doneRef} tabIndex={-1}>Password set</span>} action={{ label: "Change password", onClick: again }}>
          You can now sign in to Đìzai Studio as em@dizai.studio.
        </InlineMessage>
      ) : (
        <Form onSubmit={submit} gap="md">
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">Set your password</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">You're joining Đìzai Studio as em@dizai.studio.</Text>
          </Stack>
          <InputField ref={fieldRef} label="New password" type={shown ? "text" : "password"} autoComplete="new-password" value={password}
            onValueChange={(v) => { setPassword(v); setTried(false); }}
            error={tried && !passes ? "Meet every rule below to continue" : undefined}
            trailing={<InputLeadingTrailing icon={shown ? "icon-eye-off-line" : "icon-eye-line"} aria-label={shown ? "Hide password" : "Show password"} onClick={() => setShown((s) => !s)} />} />
          <InputConditions>
            {passwordRules.map((rule) => (
              <InputConditionItem key={rule.label} label={rule.label} state={!password ? "default" : rule.test(password) ? "success" : "wrong"} />
            ))}
          </InputConditions>
          <FormActions>
            <Button level="primary" type="submit">Set password</Button>
          </FormActions>
        </Form>
      )}
    </Card></Stack>
  );
}
