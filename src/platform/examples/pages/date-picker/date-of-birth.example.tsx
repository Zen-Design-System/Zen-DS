import { useState } from "react";
import { Button, Card, DateField, Form, FormActions, Heading, InputField, Stack, useToast } from "@zen-ds/react";
import { TODAY } from "../../data";

/** "06/14/1995", the DateField's typed format, → a Date; null while the text is incomplete or not a real day. */
function parseTyped(text: string): Date | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [month, day, year] = [Number(match[1]) - 1, Number(match[2]), Number(match[3])];
  const date = new Date(year, month, day);
  return date.getMonth() === month && date.getDate() === day ? date : null;
}
const ADULT_BY = new Date(TODAY.getFullYear() - 18, TODAY.getMonth(), TODAY.getDate());
function checkBirthday(text: string, required: boolean) {
  if (!text.trim()) return required ? "Enter your date of birth" : undefined;
  const date = parseTyped(text);
  if (!date) return "Enter the date as MM/DD/YYYY, like 06/14/1995";
  return date > ADULT_BY ? "New team members must be 18 or older" : undefined;
}

/** A far-past date is typed, or found through the calendar's month and year wheel; checked on blur and on Save. */
export default function Birthday() {
  const { toast } = useToast();
  const [birthday, setBirthday] = useState("");
  const [error, setError] = useState<string>();
  const save = () => {
    const problem = checkBirthday(birthday, true);
    setError(problem);
    if (!problem) toast({ type: "positive", title: "Details saved" });
  };
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Form onSubmit={save} gap="md">
        <Heading level={4} textStyle="Heading/Subheading">Personal details</Heading>
        <InputField label="Legal name" defaultValue="Phạm Thị Em" />
        {/* A far-past date is quicker to type; the calendar's month and year open a wheel for the decades. Validate on blur. */}
        <DateField label="Date of birth" today={TODAY} maxDate={TODAY} value={birthday} error={error} helpText="Only People Ops can see it."
          onValueChange={(next) => { setBirthday(next); if (error) setError(checkBirthday(next, false)); }}
          onBlur={() => setError(checkBirthday(birthday, false))} />
        <FormActions>
          <Button level="primary" type="submit">Save details</Button>
        </FormActions>
      </Form>
    </Card></Stack>
  );
}
