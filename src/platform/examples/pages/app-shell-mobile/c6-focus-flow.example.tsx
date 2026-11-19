import { useState, type RefObject } from "react";
import { ActionBar, AppShell, Checkbox, DateField, Heading, InputField, ProgressBar, SelectField, Stack, Text, TopNavigation, useToast } from "@zen-ds/react";
import { TODAY } from "../../data";

const nationalities = ["Vietnam", "Singapore", "Thailand", "Malaysia", "Philippines", "Indonesia", "Other"].map((name) => ({ value: name, label: name }));

/** C6 · Focus flow (Figma ◇ Master-Layout · Example, 15923:8850): AppShell/Mobile · Phone · Top=Bar with the progress in
 *  the Control-Bar · Bottom=Actions with one CTA, on Canvas/Alt. */
// scrollRef: what scrolls the screen, so the bar follows the scroll. "window" in your app.
export default function IdentityStepPhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [idNumber, setIdNumber] = useState("");
  const [matches, setMatches] = useState(true);
  const [error, setError] = useState<string>();
  const next = () => {
    if (!/^\d{12}$/.test(idNumber)) { setError("Enter the 12 digits on the front of your ID card."); return; }
    if (!matches) { toast({ title: "Check your details", children: "Tick Matches my ID once they match your card." }); return; }
    setError(undefined);
    toast({ title: "Step 3 of 4: a photo of your ID", children: "Front first, in good light." });
  };
  return (
    // A focus flow: Close instead of Back, the step in the Control-Bar, one question per screen on the white Canvas
    // (fields with no card around them) and a single full-width primary action in the Action bar.
    <AppShell canvas="alt"
      topNavigation={<TopNavigation type="default" title="Verify identity" scrollRef={scrollRef}
        leading={{ icon: "icon-x-medium-line", label: "Close", onClick: () => toast({ title: "Saved for later", children: "Pick up where you left off from Profile." }) }}
        trailing={[{ icon: "icon-help-circle-line", label: "Help with verifying", onClick: () => toast({ title: "Why we ask", children: "The law asks us to check who opens an account." }) }]}
        controlBar={<ProgressBar value={25} label="Step 2 of 4" />} />}
      actionBar={<ActionBar primaryAction={{ label: "Continue", onClick: next }} />}
    >
      <Stack gap="lg" paddingY="sm">
        <Stack gap="xs">
          <Heading level={2} textStyle="Heading/1">Tell us about you</Heading>
          <Text as="p" tone="light">We match these details with your ID card. It takes about two minutes.</Text>
        </Stack>
        <Stack gap="md">
          <InputField label="Full name (as on your ID)" defaultValue="Chen Thi Maya" autoComplete="name" />
          <DateField label="Date of birth" defaultValue="12/04/1994" today={TODAY} maxDate={TODAY} />
          <SelectField label="Nationality" options={nationalities} defaultValue="Vietnam" />
          <InputField label="ID number" placeholder="12 digits" inputMode="numeric" maxLength={12} value={idNumber} error={error}
            onValueChange={(value) => { setIdNumber(value.replace(/\D/g, "")); setError(undefined); }} />
        </Stack>
        <Checkbox label="Matches my ID" checked={matches} onCheckedChange={setMatches} />
      </Stack>
    </AppShell>
  );
}
