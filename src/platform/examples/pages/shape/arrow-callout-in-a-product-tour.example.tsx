import { Box, Button, Shape, Text, useToast } from "@zen-ds/react";

/** A product tour tip: the text, the arrow drawn to the button, the button. */
export default function TourTip() {
  const { toast } = useToast();
  return (
    <Box width={256} height={150} surface="surface" radius="lg">
      <Box position="absolute" insetLeft={16} insetTop={16}><Text>Scan a receipt to add it</Text></Box>
      {/* The arrow's angle is its rotation and its length its width, as Figma stores a line. */}
      <Shape type="arrow" position="absolute" insetLeft={80} insetTop={74} width={76} rotation={-40} strokeWeight={2} stroke="accent-solid" />
      <Box position="absolute" insetLeft={152} insetTop={98}><Button size="sm" startIcon="icon-scan-line" onClick={() => toast({ title: "Camera opened", children: "Point it at the receipt" })}>Scan</Button></Box>
    </Box>
  );
}
