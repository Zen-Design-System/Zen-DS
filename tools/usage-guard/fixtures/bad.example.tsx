// An example file (*.example.tsx) outside the portable subset: each marked line is one examples/portable-subset finding.
// expect: examples/portable-subset
import { useEffect } from "react";
// expect: examples/portable-subset
import { createContext } from "react";
import { useRef, useState } from "react";
import { Button, Stack, Text } from "@zen-ds/react";

const Theme = createContext("light");

export default function Counter() {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [count]);
  const add = () => {
    setCount(count + 1);
    // expect: examples/portable-subset
    document.querySelector<HTMLElement>("#total")?.focus();
    // expect: examples/portable-subset
    requestAnimationFrame(() => ref.current?.focus());
  };
  return (
    <Theme.Provider value="light">
      <Stack gap="md">
        <Text id="total">{`${count} added`}</Text>
        <Button ref={ref} level="primary" onClick={add}>Add one</Button>
      </Stack>
    </Theme.Provider>
  );
}
