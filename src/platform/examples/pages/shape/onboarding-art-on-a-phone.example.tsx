import { useState, type RefObject } from "react";
import { ActionBar, AppShell, Box, Heading, Shape, Stack, Text, TopNavigation, useToast } from "@zen-ds/react";

/** The three onboarding screens of the Phin & Co app. */
const tour = [
  { title: "Collect stamps", body: "Every drink adds a stamp to your card." },
  { title: "Earn a free drink", body: "Ten stamps make a free drink, any size." },
  { title: "Order ahead", body: "Skip the line at Nguyen Hue and Thao Dien." },
];

/** Each screen's art: shapes at their X / Y in one 240 × 200 free frame, Accent leading, Support colours beside. */
function TourArt({ step }: { step: number }) {
  return (
    <Box width={240} height={200}>
      {step === 0 && <>
        <Shape type="ellipse" position="absolute" insetLeft={40} insetTop={20} width={160} height={160} arcStart={135} arcSweep={75} arcRatio={82} fill="accent-solid" />
        <Shape type="ellipse" position="absolute" insetLeft={64} insetTop={44} width={112} height={112} arcStart={315} arcSweep={50} arcRatio={70} fill="accent-subtle" />
        <Shape type="ellipse" position="absolute" insetLeft={96} insetTop={76} width={48} height={48} fill="support-brown-solid" />
      </>}
      {step === 1 && <>
        <Shape type="star" position="absolute" insetLeft={40} insetTop={20} width={160} height={160} pointCount={12} starRatio={80} fill="accent-subtle" />
        <Shape type="ellipse" position="absolute" insetLeft={84} insetTop={64} width={72} height={72} fill="accent-solid" />
        <Shape type="star" position="absolute" insetLeft={176} insetTop={8} width={40} height={40} fill="support-yellow-solid" />
      </>}
      {step === 2 && <>
        <Shape position="absolute" insetLeft={68} insetTop={20} width={104} height={160} radius="xl" fill="accent-subtle" />
        <Shape type="ellipse" position="absolute" insetLeft={96} insetTop={76} width={48} height={48} fill="accent-solid" />
        <Shape type="arrow" position="absolute" insetLeft={12} insetTop={100} width={48} strokeWeight={3} stroke="support-sky-solid" />
      </>}
    </Box>
  );
}

// scrollRef: what scrolls the screen, so the bar follows it. "window" in your app.
/** Onboarding on a phone: the art changes per screen, Next / Skip in the Action bar, Back in the bar. */
export default function OnboardingPhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const [step, setStep] = useState(0);
  const { toast } = useToast();
  const last = step === tour.length - 1;
  const finish = () => { toast({ title: "Welcome to Phin & Co", children: "Your stamp card is ready" }); setStep(0); };
  return (
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title="Welcome"
        leading={step > 0 ? { icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => setStep(step - 1) } : undefined} />}
      actionBar={<ActionBar
        primaryAction={last ? { label: "Start collecting", onClick: finish } : { label: "Next", onClick: () => setStep(step + 1) }}
        secondaryAction={last ? undefined : { label: "Skip", onClick: () => setStep(tour.length - 1) }} />}>
      {/* The screen's content fills the body between the bars and centres in it. The art is decorative, so the words
          carry the screen. */}
      <Stack gap="xl" align="center" justify="center" style={{ flex: "1 1 auto" }}>
        <TourArt step={step} />
        <Stack gap="xs" align="center">
          <Text role="status" textStyle="Body/Small/Medium" tone="light">{step + 1} of {tour.length}</Text>
          <Heading level={2} textStyle="Heading/2" align="center">{tour[step].title}</Heading>
          <Text tone="base" align="center">{tour[step].body}</Text>
        </Stack>
      </Stack>
    </AppShell>
  );
}
