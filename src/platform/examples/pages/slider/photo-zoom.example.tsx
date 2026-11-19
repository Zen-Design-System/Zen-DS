import { useRef, useState } from "react";
import { Box, Button, Card, Form, FormActions, Heading, Slider, Stack, useToast } from "@zen-ds/react";
import { people } from "../../data";

export default function PhotoZoom() {
  const { toast } = useToast();
  const [zoom, setZoom] = useState(140);
  const titleRef = useRef<HTMLHeadingElement>(null);
  // Reset zoom disables itself: focus moves to the card's title, one Tab before the slider, instead of falling to the page.
  const reset = () => { titleRef.current?.focus(); setZoom(100); };
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      <Form onSubmit={() => toast({ type: "positive", title: "Profile photo updated" })} gap="md">
        <Heading ref={titleRef} level={4} textStyle="Heading/Subheading" tabIndex={-1}>Profile photo</Heading>
        {/* The crop follows the thumb while it moves: the slider tunes by eye, the preview shows the result. */}
        <Stack align="center">
          {/* A round 160px crop whose photo scales with the zoom (1–3×); with reduced motion (--zen-motion-movement 0)
              it jumps instead of sliding. */}
          <Box width={160} height={160} radius="full" clip surface="pale">
            <img src={people.alex.photo} alt={`${people.alex.name}, zoomed to ${zoom}%`}
              style={{
                display: "block", width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom / 100})`,
                transition: "transform calc(var(--zen-motion-duration-xfast, 80ms) * var(--zen-motion-movement, 1)) var(--zen-motion-ease-linear, linear)",
              }} />
          </Box>
        </Stack>
        <Stack direction="row" gap="xs" align="center">
          <Slider aria-label="Zoom" min={100} max={300} step={5} value={zoom} onValueChange={setZoom}
            icon="icon-zoom-in-solid" valueText={(value) => `${value}%`} />
        </Stack>
        <FormActions>
          <Button level="tertiary" disabled={zoom === 100} onClick={reset}>Reset zoom</Button>
          <Button level="primary" type="submit">Save photo</Button>
        </FormActions>
      </Form>
    </Card></Stack>
  );
}
