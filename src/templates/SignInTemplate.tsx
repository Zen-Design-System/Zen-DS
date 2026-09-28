/**
 * Template: sign in. Copy it into your app, point the links at your routes and replace the auth call.
 * Render it inside your app's <ZenProvider>. Uses only @zen/design-system components, no custom CSS.
 */
import {
  Box,
  Button,
  Container,
  Divider,
  Form,
  Heading,
  Icon,
  InlineMessage,
  InputField,
  Link,
  Stack,
  Text,
  useFormState,
  useToast,
} from "@zen/design-system";

/** Stand-in for your auth call: any password but "wrong" signs in. */
const signIn = (email: string, password: string) => new Promise<void>((resolve, reject) => setTimeout(() => (password === "wrong" ? reject(new Error("That email and password don’t match. Try again or reset your password.")) : resolve(void email)), 600));

export function SignInTemplate() {
  const { toast } = useToast();
  const form = useFormState({
    initialValues: { email: "", password: "" },
    validate: (values) => ({
      ...(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email) ? {} : { email: "Enter your work email, like name@company.com" }),
      ...(values.password ? {} : { password: "Enter your password" }),
    }),
    onSubmit: async (values) => {
      await signIn(values.email, values.password);
      toast({ title: "Signed in" });
    },
  });

  return (
    <Container maxWidth="sm">
      <Stack gap="lg" paddingY="3xl">
        <Box surface="surface" border="pale" radius="2xl" padding="2xl">
          <Stack gap="xl">
            <Stack gap="2xs">
              <Heading level={1}>Sign in to Acme</Heading>
              <Text tone="base">Welcome back. Use your work email.</Text>
            </Stack>

            <Form form={form} gap="md">
              {form.submitError ? <InlineMessage theme="negative" title="Couldn’t sign you in">{form.submitError}</InlineMessage> : null}
              <InputField label="Work email" type="email" autoComplete="email" placeholder="name@company.com" {...form.field("email")} />
              <InputField label="Password" type="password" autoComplete="current-password" labelAction={<Link href="#reset-password">Forgot password?</Link>} {...form.field("password")} />
              {/* align="stretch" makes the buttons full width (a Stack keeps them label-sized by default). */}
              <Stack align="stretch"><Button level="primary" size="lg" type="submit" disabled={form.isSubmitting}>{form.isSubmitting ? "Signing in…" : "Sign in"}</Button></Stack>
            </Form>

            <Stack direction="row" gap="sm" align="center">
              <Divider decorative />
              <Text as="span" textStyle="Caption/Regular" tone="light">or</Text>
              <Divider decorative />
            </Stack>
            <Stack align="stretch"><Button level="tertiary" size="lg" startIcon={<Icon name="icon-key-line" decorative />} onClick={() => toast({ title: "Redirecting to your company’s sign-in…" })}>Continue with SSO</Button></Stack>

            <Text textStyle="Body/Small/Regular" tone="base" align="center">New to Acme? <Link href="#sign-up">Create an account</Link></Text>
          </Stack>
        </Box>
        <Text textStyle="Caption/Regular" tone="light" align="center">
          By signing in you agree to the <Link href="#terms" tone="inherit">Terms of service</Link> and <Link href="#privacy" tone="inherit">Privacy policy</Link>.
        </Text>
      </Stack>
    </Container>
  );
}
