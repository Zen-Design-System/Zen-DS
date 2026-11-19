import { useRef, useState } from "react";
import { AiVoiceConversation, Card, type AiVoiceState } from "@zen-ds/react";

/** Listening and nothing heard for 4 seconds, or a turn ended with nothing in it: Zen says so and how to fix it. */
export default function NotCaught() {
  const [state, setState] = useState<AiVoiceState>("ready");
  const [missed, setMissed] = useState(false);
  // Each wait for words has an id: Done speaking and End start another, so the old wait's timer does nothing.
  const wait = useRef(0);
  const listen = () => {
    const id = ++wait.current;
    setState("listening");
    setTimeout(() => { if (wait.current === id) setMissed(true); }, 4000);
  };
  return (
    <Card theme="default" spacing="sm" width="fill" maxWidth={448}>
      <AiVoiceConversation
        state={state}
        heading={missed ? "I didn’t catch that" : undefined}
        guidance={missed ? "Say it again, a little closer to your microphone." : undefined}
        speaker={state === "ready" ? undefined : "You · Live transcript"}
        transcript={state === "ready" ? "“What’s on my calendar tomorrow?”" : "…"}
        onStart={() => { setMissed(false); listen(); }}
        onDone={() => { wait.current += 1; setMissed(true); }}
        onInterrupt={listen}
        onEnd={() => { wait.current += 1; setMissed(false); setState("ready"); }}
      />
    </Card>
  );
}
