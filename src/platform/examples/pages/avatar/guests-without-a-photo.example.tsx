import { useState } from "react";
import { Avatar, Button, Form, FormActions, InputField, List, ListBox, ListItem, Stack, type AvatarTheme } from "@zen-ds/react";
import { initials } from "../../data";

/** Initials themes whose white initials keep 3:1 contrast on the solid fill (not green, orange, teal or cyan). */
const initialsThemes: Exclude<AvatarTheme, "photo" | "accent" | "neutral">[] = ["blue", "pink", "purple", "violet", "crimson", "indigo", "plum", "brown", "red"];
/** A guest has no studio colour: the same name always gets the same one, on every screen. */
const themeOf = (name: string) => initialsThemes[Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % initialsThemes.length];

type Guest = { id: string; name: string; company: string };
const firstGuests: Guest[] = [
  { id: "g1", name: "Lena Park", company: "Lumen Bank" },
  { id: "g2", name: "Tran Minh Chau", company: "Phin & Co" },
  { id: "g3", name: "Samuel O’Neill", company: "Mekong Freight" },
];

export default function GuestInitials() {
  const [guests, setGuests] = useState(firstGuests);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  // An invalid name shows its error; Form then focuses the field and announces it.
  const add = () => {
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean.split(" ").length < 2) { setError("Enter a first and last name, like Minh Anh Vo"); return; }
    setGuests((list) => [{ id: `g${Date.now()}`, name: clean, company: "Invited just now" }, ...list]);
    setName("");
    setError(undefined);
  };
  return (
    <Stack gap="xl" align="stretch">
      <Form onSubmit={add} gap="sm">
        <InputField label="Guest name" placeholder="Minh Anh Vo" value={name} error={error}
          onValueChange={(value) => { setName(value); setError(undefined); }} />
        <FormActions><Button type="submit" level="tertiary" startIcon="icon-plus-line">Add guest</Button></FormActions>
      </Form>
      {/* zen-detached: Card · Zen Studio */}
      <ListBox>
        <List aria-label="Guests">
          {guests.map((guest) => (
            <ListItem key={guest.id} leading={<Avatar size="md" theme={themeOf(guest.name)} alt="">{initials(guest.name)}</Avatar>}
              title={guest.name} caption={guest.company} />
          ))}
        </List>
      </ListBox>
    </Stack>
  );
}
