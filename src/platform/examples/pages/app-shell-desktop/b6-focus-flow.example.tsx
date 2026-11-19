import { useState, type ReactNode } from "react";
import {
  AppShell, AppShellHeader, AppShellPane, Avatar, Badge, Box, Button, Card, DescriptionList, Divider, Form, FormActions, FormFieldset, Grid, Heading,
  IconButton, InputField, List, ListItem, RadioButton, SelectField, Stack, Stepper, Text, Thumbnail, plural, useFormState, useToast,
} from "@zen-ds/react";
import { photos } from "../../data";

const options = (values: string[]) => values.map((value) => ({ value, label: value }));

/** Figma Leading-Slots brand: a square Small Avatar (Neutral, Solid) with the product's initial, then its name. */
function Brand({ initial, children }: { initial: string; children: ReactNode }) {
  return (
    <Stack direction="row" gap="xs" align="center">
      <Avatar size="sm" shape="square" theme="neutral" background="solid" alt="">{initial}</Avatar>
      {children}
    </Stack>
  );
}

const checkoutSteps = [
  { id: "cart", title: "Cart", caption: "2 items" },
  { id: "shipping", title: "Shipping", caption: "Address & delivery" },
  { id: "payment", title: "Payment", caption: "Card or bank" },
  { id: "review", title: "Review", caption: "Place order" },
];
/* Figma B6's Thumb: the product photo in a 56 Pale frame (Image-Size/XLarge, Corner-Radius/Base). */
const orderItems = [
  { id: "urbas", name: "Urbas Love+ Slip On", variant: "Offwhite · EU 39", price: 42, photo: photos.products.offwhite },
  { id: "vintas", name: "Vintas Soda Pop High", variant: "Red Violet · EU 39", price: 58, photo: photos.products.redViolet },
];
const usd = (amount: number) => amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
const countries = options(["Vietnam", "Singapore", "Thailand", "Malaysia"]);
type Shipping = { firstName: string; lastName: string; street: string; city: string; country: string; phone: string; postcode: string; delivery: "standard" | "express" };
const required: Record<Exclude<keyof Shipping, "delivery">, string> = {
  firstName: "Enter a first name", lastName: "Enter a last name", street: "Enter a street address", city: "Enter a city", country: "Choose a country", phone: "Enter a phone number", postcode: "Enter a postcode",
};

/** A checkout: one task, no way to wander (Figma ◇ Master-Layout B6, Layout=Focus on Canvas/Default). */
export default function FocusFlowApp() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [promo, setPromo] = useState("");
  const [promoNote, setPromoNote] = useState<{ error?: string; help?: string }>({});
  const form = useFormState<Shipping>({
    initialValues: { firstName: "Maya", lastName: "Chen", street: "12 Ly Thuong Kiet, Hoan Kiem", city: "Hanoi", country: "Vietnam", phone: "+84 912 345 678", postcode: "100000", delivery: "standard" },
    validate: (values) => Object.fromEntries((Object.keys(required) as (keyof typeof required)[]).map((name) => [name, values[name].trim() ? undefined : required[name]])),
    onSubmit: () => setStep(2),
  });
  const { values } = form;
  const subtotal = orderItems.reduce((sum, item) => sum + item.price, 0);
  const shipping = values.delivery === "express" ? 9 : 0;
  const vat = subtotal * 0.1;
  const backToCart = () => toast({ title: "Back to your cart", children: "Your shipping details stay filled in." });
  const applyPromo = () => setPromoNote(promo.trim() ? { help: `${promo.trim().toUpperCase()} is checked when you place the order.` } : { error: "Enter a promo code" });
  return (
    // Focus on Canvas/Default: no app navigation, the Stepper under the top bar, "Save & exit" the only way out. The form
    // floats as a Shadow card in the 680 column and the summary as a Shadow pane beside it; the primary action ends the
    // form, never the bar.
    <AppShell pattern="focus"
      header={(
        <AppShellHeader
          leading={<Brand initial="N"><Text as="span" textStyle="Heading/4">Northwind</Text></Brand>}
          actions={<>
            <IconButton level="tertiary" icon="icon-help-circle-line" aria-label="Help" onClick={() => toast({ title: "Need a hand?", children: "Support chat opens in a new tab." })} />
            <Button level="tertiary" onClick={() => toast({ title: "Checkout saved", children: "Your cart and address wait for you in your account." })}>Save & exit</Button>
          </>}
        />
      )}
      progress={<Stepper aria-label="Checkout" steps={checkoutSteps} current={step} onStepClick={(_, index) => { if (index === 0) backToCart(); else setStep(index); }} />}
      trailingPane={(
        <AppShellPane theme="shadow" aria-label="Order summary">
          <Box padding="md">
            <Stack gap="md">
              <Stack direction="row" justify="between" align="center" gap="xs">
                <Heading level={2} textStyle="Heading/4">Order summary</Heading>
                <Badge size="sm" theme="neutral" background="solid" leadingIcon={false}>{plural(orderItems.length, "item")}</Badge>
              </Stack>
              <List aria-label="Items in your order">
                {orderItems.map((item) => (
                  <ListItem key={item.id} title={item.name} caption={item.variant} value={usd(item.price)}
                    leading={<Thumbnail src={item.photo.src} alt="" size="xl" />} />
                ))}
              </List>
              <Divider />
              <DescriptionList items={[
                { term: "Subtotal", description: usd(subtotal) },
                { term: "Shipping", description: shipping ? usd(shipping) : "Free" },
                { term: "VAT (10%)", description: usd(vat) },
              ]} />
              <Divider />
              <Stack direction="row" justify="between" align="center">
                <Text textStyle="Body/Base/Bold">Total</Text>
                <Text textStyle="Heading/3">{usd(subtotal + shipping + vat)}</Text>
              </Stack>
              <Stack direction="row" gap="xs" align="start">
                <Box width="fill">
                  <InputField aria-label="Promo code" placeholder="Promo code" value={promo} onValueChange={(value) => { setPromo(value); setPromoNote({}); }} error={promoNote.error} helpText={promoNote.help} />
                </Box>
                <Button level="tertiary" onClick={applyPromo}>Apply</Button>
              </Stack>
            </Stack>
          </Box>
        </AppShellPane>
      )}
    >
      <Card theme="shadow">
        {step === 1 ? (
          <Form form={form} gap="lg">
            <Stack gap="2xs">
              {/* The step is the screen's title, so it is the h1 in Heading/1 (Figma B6 draws Heading/2; an h1 is never
                  smaller than Heading/1). */}
              <Heading level={1}>Shipping details</Heading>
              <Text tone="light">We deliver in 2–4 business days. You can change the address until the parcel ships.</Text>
            </Stack>
            <Grid columns={2} gap="md">
              <InputField label="First name" autoComplete="given-name" {...form.field("firstName")} />
              <InputField label="Last name" autoComplete="family-name" {...form.field("lastName")} />
            </Grid>
            <InputField label="Street address" autoComplete="street-address" {...form.field("street")} />
            <Grid columns={2} gap="md">
              <InputField label="City" autoComplete="address-level2" {...form.field("city")} />
              <SelectField label="Country" options={countries} {...form.selectField("country")} />
            </Grid>
            <Grid columns={2} gap="md">
              <InputField label="Phone" type="tel" autoComplete="tel" {...form.field("phone")} />
              <InputField label="Postcode" inputMode="numeric" autoComplete="postal-code" {...form.field("postcode")} />
            </Grid>
            <Stack gap="sm">
              <Text textStyle="Body/Base/Bold" aria-hidden="true">Delivery</Text>
              <FormFieldset legend="Delivery" hideLegend kind="radio">
                <RadioButton label="Standard · 2–4 days · Free" {...form.radioField("delivery", "standard")} />
                <RadioButton label="Express · next day · $9.00" {...form.radioField("delivery", "express")} />
              </FormFieldset>
            </Stack>
            <Divider />
            <FormActions align="between">
              {/* zen-allow-back-arrow: Figma B6 Back to cart is Button/Main Large Tertiary with icon-arrow-left-line, a step back in a desktop flow. */}
              <Button level="tertiary" size="lg" startIcon="icon-arrow-left-line" onClick={backToCart}>Back to cart</Button>
              <Button type="submit" level="primary" size="lg">Continue to payment</Button>
            </FormActions>
          </Form>
        ) : (
          <Stack gap="lg">
            <Stack gap="2xs">
              <Heading level={1}>Payment</Heading>
              <Text tone="light">Card or bank</Text>
            </Stack>
            <DescriptionList items={[
              { term: "Ship to", description: `${values.firstName} ${values.lastName}, ${values.street}, ${values.city}, ${values.country} ${values.postcode}` },
              { term: "Delivery", description: values.delivery === "express" ? "Express · next day" : "Standard · 2–4 days" },
              { term: "Phone", description: values.phone },
            ]} />
            <Divider />
            <Stack direction="row">
              {/* zen-allow-back-arrow: the same step-back button as Back to cart (Figma B6). */}
              <Button level="tertiary" size="lg" startIcon="icon-arrow-left-line" onClick={() => setStep(1)}>Back to shipping</Button>
            </Stack>
          </Stack>
        )}
      </Card>
    </AppShell>
  );
}
