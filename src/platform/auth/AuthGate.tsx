import { useEffect, useState, type ReactNode } from "react";
import { Avatar } from "../../components/Avatar";
import { Button, IconButton } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { Menu } from "../../components/Menu";
import { Heading, Text } from "../../components/Text";
import { refreshSession, signInWithGoogle, signOut, useAuthUser } from "./pocketbase";
import "./auth.css";

/**
 * Required sign-in for the docs platform and Zen Studio: children render only once a Google session exists. An
 * automated browser (navigator.webdriver: the QA gate's Playwright audits and the Studio E2E) skips the gate, since it
 * cannot complete Google's consent screen. The bundle is static, so this gate is access control for the UI, not for
 * the content.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const user = useAuthUser();
  const [checked, setChecked] = useState(false);
  useEffect(() => { void refreshSession().finally(() => setChecked(true)); }, []);

  if (typeof navigator !== "undefined" && navigator.webdriver) return children;
  if (user) return children;
  // A stored session is being checked: show nothing rather than flash the sign-in screen.
  if (!checked) return null;
  return <SignInScreen />;
}

function SignInScreen() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignIn = () => {
    setPending(true);
    setError(null);
    signInWithGoogle()
      .catch((reason: unknown) => {
        const status = (reason as { isAbort?: boolean; status?: number }).isAbort ? null : (reason as { status?: number }).status;
        // The popup closed before Google answered is not an error worth a message.
        setError(status === 0 || status == null ? null : "Google sign-in failed. Try again, or ask an admin to check your account.");
        if (status !== 0 && status != null) console.error(reason);
      })
      .finally(() => setPending(false));
  };

  return (
    <main className="platform-auth">
      <section className="platform-auth__card" aria-labelledby="platform-auth-title">
        <Icon name="icon-zen" size="2xl" decorative />
        <div className="platform-auth__copy">
          <Heading level={1} id="platform-auth-title">Sign in to Zen Design System</Heading>
          <Text tone="base">Use your Google account to open the docs and Zen Studio.</Text>
        </div>
        <Button className="platform-auth__action" appearance="main" level="primary" size="lg" startIcon={<Icon name="icon-log-in-01-line" decorative />} disabled={pending} onClick={onSignIn}>
          {pending ? "Waiting for Google…" : "Continue with Google"}
        </Button>
        {error ? <Text role="alert" tone="negative-strongest" textStyle="Body/Small/Regular">{error}</Text> : null}
      </section>
    </main>
  );
}

/** The topbar's account control: the user's avatar opens a menu with who is signed in and Log out. */
export function AccountMenu() {
  const user = useAuthUser();
  if (!user) return null;
  return (
    <Menu
      aria-label="Account"
      align="end"
      items={[
        { id: "account", label: user.name, caption: user.name === user.email ? undefined : user.email, disabled: true },
        { type: "separator" },
        { id: "log-out", label: "Log out", icon: "icon-log-out-01-line", onSelect: signOut },
      ]}
      // zen-allow-no-action: the Menu's trigger (Menu wires its click and keys).
      trigger={<IconButton appearance="flat" level="primary" size="sm" aria-label={`Account: ${user.email}`} icon={<Avatar size="xs" src={user.avatarUrl} alt="">{initials(user.name)}</Avatar>} />}
    />
  );
}

function initials(name: string) {
  return name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("");
}
