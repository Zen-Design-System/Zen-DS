import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Card, Heading, Image, Stack, Text, Thumbnail, VisuallyHidden, plural } from "@zen-ds/react";
import { people, photos, type Photo } from "../../data";

// Gia's picks for Saola Outdoor's brand refresh (SAO-004).
type Pick = Photo & { id: string; name: string; note: string };
const picks: Pick[] = [
  { id: "creek", ...photos.feed[1], name: "Forest creek", note: "wet stone and deep greens for the trail range" },
  { id: "road", ...photos.feed[3], name: "Mountain road", note: "long switchbacks for a sense of distance" },
  { id: "peaks", ...photos.feed[4], name: "Snow peaks", note: "cold light for the winter shell line" },
  { id: "moss", ...photos.feed[7], name: "Moss study", note: "texture reference for the packaging" },
  { id: "field", ...photos.feed[0], name: "Sunset field", note: "warm evening tones for the campaign" },
  { id: "coast", ...photos.feed[6], name: "Coast road", note: "golden hour, a candidate for the launch hero" },
  { id: "desert", ...photos.feed[5], name: "Desert hills", note: "sand colours for the base layers" },
];

/** A Thumbnail strip that picks one picture (a radio group). */
export default function Moodboard() {
  const [index, setIndex] = useState(0);
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // The focus ring shows for the keyboard only, as :focus-visible does: a focus that no pointer press started.
  const pressed = useRef(false);
  const [ring, setRing] = useState(false);
  const titleId = useId();
  const photo = picks[index];
  // One Tab stop (roving tabindex): the arrow keys (and Home/End) move the choice and focus with it, as in any radio group.
  const step = (event: KeyboardEvent<HTMLElement>) => {
    const last = picks.length - 1;
    const forward = index === last ? 0 : index + 1, back = index === 0 ? last : index - 1;
    const next = { ArrowRight: forward, ArrowDown: forward, ArrowLeft: back, ArrowUp: back, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setIndex(next);
    radioRefs.current[next]?.focus();
  };
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Moodboard for the outdoor range</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`Saola Outdoor · ${plural(picks.length, "photo")} from ${people.gia.name}`}</Text>
        </Stack>
        {/* The first picture on screen loads eagerly; the caption adds what the picture can't say. */}
        <Image src={photo.src} alt={photo.alt} ratio="4:3" radius="lg" loading="eager" caption={`${photo.name} · ${photo.note}`} />
        <Stack direction="row" gap="xs" wrap role="radiogroup" aria-label="Moodboard photos" onKeyDown={step}>
          {picks.map((pick, i) => (
            // The radio carries the name and the checked state, so the Thumbnail inside is alt="". Its corners follow the
            // Thumbnail's (lg = Corner-Radius/Base), so the checked ring wraps it evenly.
            <button key={pick.id} ref={(button) => { radioRefs.current[i] = button; }} type="button" role="radio" aria-label={pick.name} aria-checked={i === index}
              tabIndex={i === index ? 0 : -1} onClick={() => setIndex(i)}
              onPointerDown={() => { pressed.current = true; }} onFocus={() => { setRing(!pressed.current); pressed.current = false; }} onBlur={() => setRing(false)}
              style={{
                display: "block", padding: 0, border: 0, background: "none", cursor: "pointer", borderRadius: "var(--zen-corner-radius-base, 12px)",
                outline: i !== index ? undefined : ring ? "3px solid var(--zen-color-focus-accent-solid, #ff66d4)" : "2px solid var(--zen-color-border-active-neutral-solid, #111)",
                outlineOffset: "2px",
              }}>
              <Thumbnail src={pick.src} alt="" size="lg" style={{ display: "block" }} />
            </button>
          ))}
        </Stack>
        <VisuallyHidden role="status">{`${photo.name}, photo ${index + 1} of ${picks.length}`}</VisuallyHidden>
      </Stack>
    </Card>
  );
}
