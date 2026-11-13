// An example file inside the portable subset: state, ids, an element ref focused from a handler, a Zen hook.
import { useId, useRef, useState } from "react";
import { Button, Stack, Text, useToast } from "@zen-ds/react";

export default function Counter() {
  const { toast } = useToast();
  const [count, setCount] = useState(0);
  const totalId = useId();
  const resetRef = useRef<HTMLButtonElement>(null);
  // "document.querySelector" in a comment or a string is not code.
  const add = () => {
    setCount(count + 1);
    setTimeout(() => resetRef.current?.focus());
  };
  return (
    <Stack gap="md" aria-labelledby={totalId}>
      <Text id={totalId}>{count ? `${count} added` : "Nothing added yet"}</Text>
      <Button level="primary" onClick={add}>Add one</Button>
      {count > 0 ? <Button ref={resetRef} level="tertiary" onClick={() => { setCount(0); toast({ title: "Counter reset" }); }}>Reset</Button> : null}
    </Stack>
  );
}
