import { useState } from "react";
import { Card, Flag, Heading, InputField, InputLeadingTrailing, Stack } from "@zen-ds/react";

const dialCodes = [
  { value: "vn", label: "+84", caption: "Vietnam", flag: <Flag name="Vietnam" size="sm" /> },
  { value: "sg", label: "+65", caption: "Singapore", flag: <Flag name="Singapore" size="sm" /> },
  { value: "us", label: "+1", caption: "United States", flag: <Flag name="United States" size="sm" /> },
  { value: "jp", label: "+81", caption: "Japan", flag: <Flag name="Japan" size="sm" /> },
  { value: "au", label: "+61", caption: "Australia", flag: <Flag name="Australia" size="sm" /> },
];
const currencies = [
  { value: "usd", label: "USD", caption: "US dollar" },
  { value: "sgd", label: "SGD", caption: "Singapore dollar" },
  { value: "vnd", label: "VND", caption: "Vietnamese dong" },
];

/** Leading and Trailing slots with options are pickers; one without options stays decorative. */
export default function ClientContact() {
  const [dial, setDial] = useState("sg");
  const [phone, setPhone] = useState("9123 4567");
  const [site, setSite] = useState("lumenbank.sg");
  const [currency, setCurrency] = useState("usd");
  const [retainer, setRetainer] = useState("12,000");
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Stack gap="md">
        <Heading level={4} textStyle="Heading/Subheading">Lumen Bank</Heading>
        <InputField label="Phone" type="tel" value={phone} onValueChange={setPhone}
          leading={<InputLeadingTrailing label="+65" options={dialCodes} value={dial} onValueChange={setDial} popoverLabel="Country code" align="start" />} />
        <InputField label="Website" value={site} onValueChange={setSite}
          leading={<InputLeadingTrailing label="https://" interactive={false} />} />
        <InputField label="Monthly retainer" inputMode="decimal" value={retainer} onValueChange={setRetainer} helpText="Billed on the 1st of each month."
          trailing={<InputLeadingTrailing label="USD" options={currencies} value={currency} onValueChange={setCurrency} popoverLabel="Currency" />} />
      </Stack>
    </Card></Stack>
  );
}
