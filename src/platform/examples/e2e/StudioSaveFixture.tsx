import { Button } from "../../../components/Button";
import { Stack } from "../../../components/Layout";
import { Text } from "../../../components/Text";

/**
 * Zen Studio E2E save fixture (tools/studio/e2e). The harness's E2E page renders it, and it is the one file the harness
 * saves to disk. The harness restores it byte for byte after every run, so keep it small and import it nowhere else.
 */
export function StudioSaveFixture() {
  return (
    <Stack data-e2e="save-root" gap="sm" padding="lg">
      <Text data-e2e="save-text">Saved text</Text>
      <Stack direction="row" gap="sm">
        {/* zen-allow-action-handler: E2E fixture, never shown on the platform; the harness only edits these props. */}
        <Button data-e2e="save-a" level="tertiary">One</Button>
        {/* zen-allow-action-handler: E2E fixture, never shown on the platform; the harness only edits these props. */}
        <Button data-e2e="save-b" level="tertiary">Two</Button>
      </Stack>
    </Stack>
  );
}
