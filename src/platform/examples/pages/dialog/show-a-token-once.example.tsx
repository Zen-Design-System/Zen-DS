import { useState } from "react";
import { Box, Button, Card, Dialog, DockIcon, Form, FormActions, Heading, InputField, List, ListItem, Stack, Text } from "@zen-ds/react";
import { TODAY, daysFromToday, formatRelative } from "../../data";

type Token = { id: string; name: string; created: Date; used?: Date };
const firstTokens: Token[] = [
  { id: "figma", name: "Figma plugin", created: daysFromToday(-16, 11, 0), used: daysFromToday(0, 10, 17) },
  { id: "ci", name: "CI deploy", created: new Date(2026, 7, 2, 15, 30), used: daysFromToday(-1, 18, 2) },
];
/** A demo secret; your server creates the real one. */
const makeToken = () => `zen_pat_${Array.from({ length: 28 }, () => "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 55)]).join("")}`;
/** A timestamp inside a sentence: "just now", "yesterday at 6:02 pm", "Sep 14 at 11:00 am". */
const since = (d: Date) => formatRelative(d).replace(/^(Just now|Yesterday)/, (word) => word.toLowerCase());

/** Access tokens: a new one shows once, in a positive Dialog that only Done closes. */
export default function TokenOnce() {
  const [tokens, setTokens] = useState(firstTokens);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [secret, setSecret] = useState("");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Form focuses the field and announces the error when the name is missing.
  const create = () => {
    const label = name.trim();
    if (!label) return setNameError("Name the token so you can tell it apart later.");
    setTokens((list) => [{ id: `t${list.length}`, name: label, created: TODAY }, ...list]);
    setSecret(makeToken());
    setCopied(false);
    setName("");
    setOpen(true);
  };
  const copy = () => { navigator.clipboard?.writeText(secret).catch(() => undefined); setCopied(true); };
  const newest = tokens[0];
  return (
    <Card theme="default" spacing="md" width="fill">
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Access tokens</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Tokens let your tools read and publish the Zen design system.</Text>
        </Stack>
        <Form onSubmit={create} gap="md">
          <InputField label="Token name" placeholder="Storybook deploy" autoComplete="off" value={name}
            onValueChange={(value) => { setName(value); setNameError(undefined); }} error={nameError} />
          <FormActions>
            <Button type="submit" level="primary" startIcon="icon-key-line">Create token</Button>
          </FormActions>
        </Form>
        <List aria-label="Access tokens">
          {tokens.map((token) => (
            <ListItem key={token.id} title={token.name}
              caption={`Created ${since(token.created)} · ${token.used ? `last used ${since(token.used)}` : "never used"}`}
              leading={<DockIcon icon="icon-key-line" theme="neutral" background="subtle" />} />
          ))}
        </List>
      </Stack>
      {/* Shown once: no scrim or Escape dismissal, so the token isn't lost by accident. Done is the way out. */}
      <Dialog open={open} onOpenChange={setOpen} theme="positive" dismissible={false} title="Copy your new token"
        description={`“${newest.name}” can read and publish the Zen design system. You won't see this token again.`}
        primaryAction={{ label: "Done" }}>
        {/* Read-only: the value can be selected and copied but not changed. The copy action sits outside the field. */}
        <Stack gap="md" align="start">
          <Box alignSelf="stretch">
            <InputField label="Token" readOnly value={secret} helpText={copied ? "Copied to the clipboard." : undefined} helpTheme="positive" />
          </Box>
          <Button level="tertiary" startIcon={copied ? "icon-check-line" : "icon-copy-line"} onClick={copy}>Copy token</Button>
        </Stack>
      </Dialog>
    </Card>
  );
}
