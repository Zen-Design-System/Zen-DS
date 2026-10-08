/**
 * Template: sign in. Copy it into your app, point the links at your routes and replace the three auth calls.
 * Render it inside your app's <ZenProvider>. Uses only @zen/design-system components, no custom CSS.
 *
 * - Sign in: work email and password (with Show password), checked when a field is left and on submit. The button reads
 *   "Signing in…" while the request runs; wrong credentials bring up a Negative InlineMessage above the fields and
 *   select the password for the retry.
 * - Continue with SSO finds the company's identity provider from the work email, so it asks for the email first.
 * - Forgot password? opens the reset view with the email carried over; Send reset link leads to "Check your email".
 * - A centred Surface card on the Canvas; phones drop the card and keep the same order.
 */
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import {
  Avatar,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Form,
  Heading,
  InlineMessage,
  InputField,
  InputLeadingTrailing,
  Link,
  Stack,
  Text,
  useFormState,
  useToast,
  useZen,
} from "@zen/design-system";
import workspaceLogo from "./hr/assets/workspace-logo.png";

/* ── Sample data and auth stand-ins: replace with your own ─────────────── */
const workspace = { name: "Đìzai Studio", domain: "dizai.studio", logo: workspaceLogo };

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** Your sign-in call. In this demo any password shorter than 8 characters is wrong. */
async function signIn(_email: string, password: string) {
  await wait(900);
  if (password.length < 8) throw new Error("Check both and try again, or reset your password.");
}
/** Your reset-link call. */
const sendResetLink = (_email: string) => wait(900);
/** Your SSO redirect: it looks up the identity provider of the email's domain. */
const startSso = (_email: string) => wait(900);

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** The work-email check both forms share. */
const checkEmail = (email: string) =>
  !email.trim() ? "Enter your work email" : emailPattern.test(email.trim()) ? undefined : `Enter an email address like name@${workspace.domain}`;

type View = "sign-in" | "reset" | "sent";

export function SignInTemplate() {
  const { toast } = useToast();
  const phone = useZen()?.breakpoint === "mobile";
  const [view, setView] = useState<View>("sign-in");
  const [passwordShown, setPasswordShown] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [resending, setResending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const resendRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  /** Switch views and move focus to the new title, so screen readers announce it. */
  const go = (next: View) => {
    setView(next);
    requestAnimationFrame(() => titleRef.current?.focus());
  };

  const signInForm = useFormState({
    initialValues: { email: "", password: "" },
    validate: (values) => ({ email: checkEmail(values.email), password: values.password ? undefined : "Enter your password" }),
    onSubmit: async (values) => {
      await signIn(values.email.trim(), values.password);
      toast({ title: "Signed in", children: `Welcome back to ${workspace.name}.` });
    },
  });
  // Wrong credentials: the message above the fields says why, and the password is selected for the retry (the Sign in
  // button was disabled while the request ran, so focus would otherwise fall back to the page).
  const { submitError } = signInForm;
  useEffect(() => { if (submitError) passwordRef.current?.select(); }, [submitError]);
  const resetForm = useFormState({
    initialValues: { email: "" },
    validate: (values) => ({ email: checkEmail(values.email) }),
    onSubmit: async (values) => {
      await sendResetLink(values.email.trim());
      go("sent");
    },
  });

  const openReset = () => {
    resetForm.reset({ email: signInForm.values.email.trim() });
    go("reset");
  };
  const backToSignIn = () => {
    // After a reset link the old attempt is over: keep the email, clear the password and the error.
    if (view === "sent") signInForm.reset({ email: resetForm.values.email.trim(), password: "" });
    else signInForm.setValue("email", resetForm.values.email);
    go("sign-in");
  };
  const continueWithSso = async () => {
    const email = signInForm.values.email.trim();
    if (checkEmail(email)) {
      signInForm.setError("email", "Enter your work email to continue with SSO");
      emailRef.current?.focus();
      return;
    }
    setRedirecting(true);
    await startSso(email);
    setRedirecting(false);
    toast({ title: "Signed in with SSO", children: `Welcome back to ${workspace.name}.` });
  };
  const resend = async () => {
    setResending(true);
    await sendResetLink(resetForm.values.email.trim());
    // The button is enabled again before it takes focus back.
    flushSync(() => setResending(false));
    resendRef.current?.focus();
    toast({ title: "Reset link sent", children: `A new link is on its way to ${resetForm.values.email.trim()}.` });
  };
  /** Sign-up and legal pages are routes of your app; this demo only names them. */
  const notInDemo = (label: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    toast({ title: `${label} isn't part of this demo` });
  };

  const busy = signInForm.isSubmitting || redirecting;
  const header = {
    "sign-in": { title: `Sign in to ${workspace.name}`, description: "Welcome back to your HR workspace." },
    reset: { title: "Reset your password", description: "Enter your work email and we'll send you a link to set a new one." },
    sent: {
      title: "Check your email",
      description: <>We sent a reset link to <Text as="span" textStyle="Body/Base/Bold">{resetForm.values.email.trim()}</Text>. It works for 30 minutes.</>,
    },
  }[view];

  const card = (
    <Stack gap="xl">
      <Stack gap="md" align="center">
        <Avatar size="lg" shape="square" theme="photo" src={workspace.logo} alt="" />
        <Stack gap="xs">
          <Heading level={1} align="center" ref={titleRef} tabIndex={-1}>{header.title}</Heading>
          <Text tone="base" align="center">{header.description}</Text>
        </Stack>
      </Stack>

      {view === "sign-in" ? (
        <Stack gap="lg">
          <Form form={signInForm}>
            {signInForm.submitError ? (
              <InlineMessage theme="negative" title="Wrong email or password" action={{ label: "Reset password", onClick: openReset }}>
                {signInForm.submitError}
              </InlineMessage>
            ) : null}
            <Stack gap="md">
              <Stack direction="row" fillChildren width="fill">
                <InputField ref={emailRef} label="Work email" type="email" autoComplete="email" placeholder={`name@${workspace.domain}`} size="lg"
                  {...signInForm.field("email")} />
              </Stack>
              <InputField ref={passwordRef} label="Password" type={passwordShown ? "text" : "password"} autoComplete="current-password" size="lg"
                labelAction={<Link href="/forgot-password" onClick={(event) => { event.preventDefault(); openReset(); }}>Forgot password?</Link>}
                trailing={<InputLeadingTrailing size="lg" icon={passwordShown ? "icon-eye-off-line" : "icon-eye-line"}
                  aria-label={passwordShown ? "Hide password" : "Show password"} onClick={() => setPasswordShown((shown) => !shown)} />}
                {...signInForm.field("password")} />
            </Stack>
            <Stack align="stretch">
              <Button level="primary" size="lg" type="submit" disabled={busy}>{signInForm.isSubmitting ? "Signing in…" : "Sign in"}</Button>
            </Stack>
          </Form>

          <Stack direction="row" gap="sm" align="center">
            <Divider decorative />
            <Text as="span" textStyle="Caption/Regular" tone="light">or</Text>
            <Divider decorative />
          </Stack>
          <Stack align="stretch">
            <Button level="tertiary" size="lg" startIcon="icon-key-line" disabled={busy} onClick={continueWithSso}>
              {redirecting ? "Redirecting…" : "Continue with SSO"}
            </Button>
          </Stack>
          <Text textStyle="Body/Small/Regular" tone="base" align="center">
            New to {workspace.name}? <Link href="/sign-up" underline="always" onClick={notInDemo("Sign-up")}>Create an account</Link>
          </Text>
        </Stack>
      ) : view === "reset" ? (
        <Form form={resetForm}>
          <InputField label="Work email" type="email" autoComplete="email" placeholder={`name@${workspace.domain}`} size="lg" {...resetForm.field("email")} />
          <Stack gap="sm" align="stretch">
            <Button level="primary" size="lg" type="submit" disabled={resetForm.isSubmitting}>{resetForm.isSubmitting ? "Sending…" : "Send reset link"}</Button>
            <Button level="tertiary" size="lg" disabled={resetForm.isSubmitting} onClick={backToSignIn}>Back to sign in</Button>
          </Stack>
        </Form>
      ) : (
        <Stack gap="sm" align="stretch">
          <Button level="primary" size="lg" disabled={resending} onClick={backToSignIn}>Back to sign in</Button>
          <Button ref={resendRef} level="tertiary" size="lg" disabled={resending} onClick={resend}>{resending ? "Sending…" : "Resend link"}</Button>
        </Stack>
      )}
    </Stack>
  );

  return (
    <Container maxWidth="sm">
      {/* Fills the screen and centres the card: 100cqh is the viewport height in an app (the frame's height in a size container). */}
      <Stack gap="lg" justify={phone ? "start" : "center"} paddingY={phone ? "2xl" : "xl"} style={{ minHeight: "100cqh", boxSizing: "border-box" }}>
        {/* No Sidebar sets an elevation here, so the card takes the default pairing: a flat Surface on the Canvas, no
            border and no shadow (usage rules §16; on a phone the form stands on the page). */}
        {phone ? card : <Card theme="flat"><Box padding="xl">{card}</Box></Card>}

        {view === "sign-in" ? (
          <Text textStyle="Caption/Regular" tone="light" align="center">
            By signing in, you agree to the <Link href="/terms" tone="inherit" onClick={notInDemo("Terms of service")}>Terms of service</Link> and{" "}
            <Link href="/privacy" tone="inherit" onClick={notInDemo("Privacy policy")}>Privacy policy</Link>.
          </Text>
        ) : null}
      </Stack>
    </Container>
  );
}
