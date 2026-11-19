import { Box, Button, Card, Heading, Shape, Stack, Text, useToast } from "@zen-ds/react";
import { studio } from "../../data";

/** The welcome card: copy, an action, and its decoration in a free frame beside them. */
export default function WelcomeCard() {
  const { toast } = useToast();
  return (
    <Card theme="default">
      <Stack direction="row" gap="lg" align="center" wrap>
        <Stack gap="xs" width="fill" minWidth={200}>
          <Heading level={3} textStyle="Heading/4">Welcome to {studio.name}</Heading>
          <Text tone="base">Your workspace is ready. Invite the team to start.</Text>
          <Button size="sm" onClick={() => toast({ title: "Invite link copied", children: `${studio.domain}/join` })}>Invite people</Button>
        </Stack>
        {/* A free frame: each Shape at its X / Y (px insets), decorative, so no label. */}
        <Box width={160} height={120}>
          <Shape type="ellipse" position="absolute" insetLeft={24} insetTop={8} width={96} height={96} arcRatio={60} fill="accent-solid" />
          <Shape type="ellipse" position="absolute" insetLeft={88} insetTop={56} width={64} height={64} arcStart={180} arcSweep={50} fill="support-yellow-solid" />
          <Shape type="star" position="absolute" insetLeft={4} insetTop={72} width={40} height={40} fill="support-sky-solid" />
        </Box>
      </Stack>
    </Card>
  );
}
