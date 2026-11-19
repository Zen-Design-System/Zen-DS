import { useState } from "react";
import { Card, Heading, InputField, Stack } from "@zen-ds/react";

const phinAddress = "12 Ton That Dam, Ben Nghe Ward, District 1, Ho Chi Minh City";

/** An info tooltip, (Optional) and a label action: the parts a field's label can carry. */
export default function BillingDetails() {
  const [email, setEmail] = useState("accounts@phinco.vn");
  const [po, setPo] = useState("");
  const [address, setAddress] = useState("");
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Stack gap="md">
        <Heading level={4} textStyle="Heading/Subheading">Billing details</Heading>
        <Stack gap="md" direction="column">
          <InputField label="Billing email" type="email" labelTooltip="Invoices and payment receipts go to this address." value={email} onValueChange={setEmail} />
          <InputField label="PO number" labelOptional placeholder="e.g. PO-4471" helpText="Printed on every invoice when set." value={po} onValueChange={setPo} />
          <InputField label="Billing address" placeholder="Street, ward, district, city" value={address} onValueChange={setAddress}
            labelAction={<button type="button" onClick={() => setAddress(phinAddress)}>Use company address</button>} />
        </Stack>
      </Stack>
    </Card></Stack>
  );
}
