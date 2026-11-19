import { useState, type FormEvent } from "react";
import { Button, Card, Form, FormActions, Heading, InputField, InputLeadingTrailing, Stack, useToast } from "@zen-ds/react";

const savedAddress = "dizai-studio";
const takenAddresses = ["dizai", "phin", "lumen", "saola", "studio", "zen"];
const personalDomain = /@(gmail|yahoo|outlook|hotmail|icloud)\./i;

/** Help text changes theme with the value: a count, Positive or an error on blur, a Warning for a personal email. */
export default function WorkspaceProfile() {
  const { toast } = useToast();
  const [name, setName] = useState("Đìzai Studio");
  const [address, setAddress] = useState(savedAddress);
  const [current, setCurrent] = useState(savedAddress);
  const [checked, setChecked] = useState(false);
  const [support, setSupport] = useState("dizai.studio@gmail.com");
  // The address is checked when the field is left (or on Save), never while typing.
  const addressError = !checked || address === current ? undefined
    : !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(address) ? "Use only lowercase letters, numbers and hyphens"
      : takenAddresses.includes(address) ? `zen.so/${address} is taken. Try another address.` : undefined;
  const addressHelp = address === current ? `People sign in at zen.so/${current}.` : checked ? `zen.so/${address} is available.` : "Lowercase letters, numbers and hyphens.";
  const personal = personalDomain.test(support);
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChecked(true);
    const ok = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(address) && !takenAddresses.includes(address);
    if (!ok && address !== current) return;
    setCurrent(address);
    setChecked(false);
    toast({ type: "positive", title: "Workspace updated" });
  };
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Form onSubmit={save} gap="md">
        <Heading level={4} textStyle="Heading/Subheading">Workspace profile</Heading>
        <InputField label="Workspace name" maxLength={32} characterLimit helpText="Shown in the sidebar and on invoices." value={name} onValueChange={setName} />
        <InputField label="Workspace address" value={address} onValueChange={(v) => { setAddress(v.toLowerCase()); setChecked(false); }} onBlur={() => setChecked(true)}
          leading={<InputLeadingTrailing label="zen.so/" interactive={false} />}
          error={addressError} helpText={addressHelp} helpTheme={checked && address !== current ? "positive" : "neutral"} />
        <InputField label="Support email" type="email" value={support} onValueChange={setSupport}
          helpText={personal ? "Personal addresses can miss client replies. Use a studio address." : "Clients reply to this address."}
          helpTheme={personal ? "warning" : "neutral"} />
        <FormActions>
          <Button level="primary" type="submit">Save changes</Button>
        </FormActions>
      </Form>
    </Card></Stack>
  );
}
