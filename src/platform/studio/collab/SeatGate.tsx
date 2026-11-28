import type { ReactNode } from "react";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Heading, Text } from "../../../components/Text";
import { signOut, useAuthUser } from "../../auth/pocketbase";
import { useCollab } from "./collabStore";

/*
 * The hosted Studio's door (GĐ 1; user 2026-11-22: only licence holders / seats sign in). A build for studio.dizai.studio
 * (VITE_STUDIO_HOSTED=1, `npm run studio:build:hosted`) opens only for an account that holds a seat (studio_seats, filled
 * by the developer from Polar); the server's rules refuse every shared project to anyone else anyway. A Studio on a
 * developer's own machine (npm run dev) has no door: its pages stay on that machine. Offline, a stored session goes in.
 */

export const HOSTED = import.meta.env.VITE_STUDIO_HOSTED === "1";

export function SeatGate({ children }: { children: ReactNode }) {
  const user = useAuthUser();
  const { status } = useCollab();
  if (!HOSTED || (typeof navigator !== "undefined" && navigator.webdriver)) return children;
  if (user && (status === "loading" || (status === "signed-out"))) return null;
  if (status === "no-seat" || status === "unavailable") {
    return (
      <main className="platform-auth">
        <section className="platform-auth__card" aria-labelledby="studio-seat-title">
          <Icon name="icon-zen" size="2xl" decorative />
          <div className="platform-auth__copy">
            <Heading level={1} id="studio-seat-title">{status === "no-seat" ? "No Zen Studio seat" : "Zen Studio isn't ready yet"}</Heading>
            <Text tone="base">
              {status === "no-seat"
                ? `${user?.email ?? "This account"} has no Zen Studio seat. Ask your team's admin for one, or sign in with the account that has it.`
                : "Its sharing server isn't set up yet. Try again later."}
            </Text>
          </div>
          <Button className="platform-auth__action" appearance="main" level="primary" size="lg" startIcon={<Icon name="icon-log-out-01-line" decorative />} onClick={signOut}>Log out</Button>
        </section>
      </main>
    );
  }
  return children;
}
