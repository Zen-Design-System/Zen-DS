import { useRef, useState, type RefObject } from "react";
import {
  AppShell, Avatar, ChatComposer, ChatDateDivider, ChatMessage, ChatThread, ChatVoice, Stack, TopNavigation, VisuallyHidden, chatHoldActionsFor,
  chatReactionGlyph, useToast,
  type ChatPerson, type ChatReactionKind, type ChatReplyTarget, type ChatSide,
} from "@zen-ds/react";
import { daysFromToday, formatTime, people } from "../../data";

const { bao } = people;
const baoPerson: ChatPerson = { name: bao.name, src: bao.photo, theme: bao.theme };
const intro = "Recorded the checkout walkthrough for you, it's quicker than typing it out 🙂";
/** The two voice messages and how long each runs, in seconds. */
const lengths = { bao: 32, you: 18 };
type VoiceId = keyof typeof lengths;
/** Where a voice message is: playing or not, how far in (seconds) and at what speed. */
type Playback = { playing: boolean; at: number; speed: number };
const stopped: Playback = { playing: false, at: 0, speed: 1 };
const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
/** What the hold actions without a screen of their own report in the status line. */
const actionNote: Record<string, string> = { forward: "Forward", pin: "Pinned", more: "More options", report: "Reported" };

/**
 * Voice messages on a phone: ChatVoice plays in its bubble, the played share of the waveform turns full strength, a tap,
 * drag or arrow key on the waveform seeks, and the speed steps 1× → 1.5× → 2×. Hold a bubble for Reply, Forward, Pin and Delete.
 */
// scrollRef: what scrolls the screen, so the bar shows its rule once messages run under it. "window" in your app.
export default function VoiceMessages({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast, dismiss } = useToast();
  const [voices, setVoices] = useState<Record<VoiceId, Playback>>({ bao: stopped, you: stopped });
  const [sent, setSent] = useState<{ id: string; text: string }[]>([]);
  const [picked, setPicked] = useState<Record<string, ChatReactionKind | undefined>>({});
  const [deleted, setDeleted] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<ChatReplyTarget | undefined>(undefined);
  // What the last action did, for screen readers.
  const [note, setNote] = useState("");
  // A deleted bubble had focus: focus moves to the chat's title.
  const titleRef = useRef<HTMLSpanElement>(null);
  // The run each voice message's timer belongs to: pausing, seeking or a new speed ends the old run.
  const runs = useRef<Record<VoiceId, number>>({ bao: 0, you: 0 });

  const update = (id: VoiceId, next: Partial<Playback>) => setVoices((all) => ({ ...all, [id]: { ...all[id], ...next } }));
  /** Plays from `from` seconds at `speed`: every 250 ms the progress moves on, and the end stops and rewinds it. */
  const play = (id: VoiceId, from: number, speed: number) => {
    const run = runs.current[id] + 1;
    runs.current[id] = run;
    update(id, { playing: true, at: from, speed });
    const step = (at: number) => setTimeout(() => {
      // A newer run took over, or the example has closed (its title is gone): this run stops.
      if (runs.current[id] !== run || !titleRef.current) return;
      const next = at + 0.25 * speed;
      if (next >= lengths[id]) { update(id, { playing: false, at: 0 }); return; }
      update(id, { at: next });
      step(next);
    }, 250);
    step(from);
  };
  const pause = (id: VoiceId) => { runs.current[id] += 1; update(id, { playing: false }); };
  /** ChatVoice's controlled props for one voice message: play and pause, the speed, and seeking on the waveform. */
  const voice = (id: VoiceId) => {
    const { playing, at, speed } = voices[id];
    return {
      playing, speed, progress: at / lengths[id], elapsed: mmss(at), duration: mmss(lengths[id]),
      onPlayingChange: (next: boolean) => (next ? play(id, at, speed) : pause(id)),
      onSpeedChange: (next: number) => (playing ? play(id, at, next) : update(id, { speed: next })),
      onSeek: (share: number) => (playing ? play(id, share * lengths[id], speed) : update(id, { at: share * lengths[id] })),
    };
  };

  /** Delete can be undone, so it acts at once and the toast offers Undo. */
  const remove = (id: string) => {
    setDeleted((all) => [...all, id]);
    setReplyTo((target) => (target?.id === id ? undefined : target));
    setNote("Message deleted");
    setTimeout(() => titleRef.current?.focus());
    const toastId = toast({
      title: "Message deleted",
      action: { label: "Undo", onClick: () => { setDeleted((all) => all.filter((other) => other !== id)); dismiss(toastId); setNote("Message restored"); setTimeout(() => titleRef.current?.focus()); } },
    });
  };
  /** Hold actions and reactions for one message, spread onto its ChatMessage. A voice message is held like a file. */
  const act = (id: string, side: ChatSide, kind: "text" | "voice", text?: string, duration?: string) => {
    const who = side === "you" ? "You" : bao.name;
    const mineReaction = picked[id];
    return {
      id,
      holdActions: chatHoldActionsFor(kind, side),
      onHoldAction: (action: string) => {
        if (action === "delete") remove(id);
        // Reply fills the composer's "Replying to" bar (the composer moves focus into its field).
        else if (action === "reply") { setReplyTo({ id, author: who, fromYou: side === "you", kind, text, duration }); setNote(`Replying to ${side === "you" ? "yourself" : who} — type in the composer`); }
        else if (action === "copy" && text) { navigator.clipboard?.writeText(text).catch(() => undefined); setNote(`Copied “${text.slice(0, 40)}”`); }
        else setNote(`${actionNote[action] ?? action} · ${side === "you" ? "your message" : `${who}'s message`}`);
      },
      reaction: mineReaction,
      onReact: (next: ChatReactionKind | undefined) => { setPicked((all) => ({ ...all, [id]: next })); setNote(next ? `Reacted ${chatReactionGlyph(next)}` : "Reaction removed"); },
      reactions: mineReaction ? [{ kind: mineReaction }] : undefined,
    };
  };
  const shownSent = sent.filter((message) => !deleted.includes(message.id));
  const header = (what: string) => () => setNote(`${what}…`);

  return (
    <AppShell
      // The conversation header (Figma ◆ Social): Back, the person and their presence, and one pill for both calls. This
      // example has no other screens: each action reports in the status line.
      topNavigation={<TopNavigation type="alt" margin="compact" scrollRef={scrollRef} title={<span ref={titleRef} tabIndex={-1}>{bao.name}</span>} subtitle="Active now"
        titleLeading={<Avatar size="large" theme="photo" background="subtle" src={bao.photo} alt="" status />}
        onTitleClick={header(`Open ${bao.name} details`)} titleLabel={`${bao.name}, active now. Open details`}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: header("Back to conversations") }}
        trailing={[
          { icon: "icon-phone-line", label: "Audio call", group: "call", onClick: header(`Calling ${bao.name}`) },
          { icon: "icon-video-recorder-line", label: "Video call", group: "call", onClick: header(`Starting a video call with ${bao.name}`) },
        ]} />}
      // The composer is the screen's input bar, pinned where an Action bar goes.
      actionBar={<ChatComposer
        actions={[
          { icon: "icon-plus-circle-line", label: "Add attachment", onClick: () => setNote("Add attachment: files, location, contact") },
          { icon: "icon-microphone-line", label: "Record voice", onClick: () => setNote("Recording a voice message…") },
          { icon: "icon-image-line", label: "Send a photo", onClick: () => setNote("Choose a photo to send") },
        ]}
        onEmoji={() => setNote("Emoji picker")}
        replyTo={replyTo} onCancelReply={() => { setReplyTo(undefined); setNote("Reply cancelled"); }}
        onSend={(text) => { setReplyTo(undefined); setSent((all) => [...all, { id: `voice-sent-${all.length}`, text }]); setNote("Sent"); }} />}
    >
      {/* The thread keeps its own 16px padding edge to edge (Figma Chat 375): it takes back the body's margins and fills
          the screen, so the newest message sits right above the composer. */}
      <Stack gap="none" fillChildren style={{ flex: "1 1 auto", minHeight: 0, marginInline: "calc(-1 * var(--zen-margin-comfortable, 20px))", marginBlockEnd: "calc(-1 * var(--zen-app-shell-body-pad-end, 20px))" }}>
        <ChatThread aria-label={`Voice messages with ${bao.name}`}>
          <ChatDateDivider>{formatTime(daysFromToday(0, 9, 38))}</ChatDateDivider>
          {deleted.includes("voice-intro") ? null : (
            <ChatMessage side="others" author={baoPerson} continued={!deleted.includes("voice-bao")} {...act("voice-intro", "others", "text", intro)}>{intro}</ChatMessage>
          )}
          {deleted.includes("voice-bao") ? null : (
            <ChatMessage side="others" author={baoPerson} {...act("voice-bao", "others", "voice", undefined, "0:32")}>
              <ChatVoice side="others" {...voice("bao")} />
            </ChatMessage>
          )}
          {deleted.includes("voice-you") ? null : (
            <ChatMessage side="you" status={shownSent.length ? undefined : "Seen"} {...act("voice-you", "you", "voice", undefined, "0:18")}>
              <ChatVoice side="you" {...voice("you")} />
            </ChatMessage>
          )}
          {shownSent.map((message, index) => (
            <ChatMessage key={message.id} side="you" continued status={index === shownSent.length - 1 ? "Sent" : undefined} {...act(message.id, "you", "text", message.text)}>{message.text}</ChatMessage>
          ))}
        </ChatThread>
      </Stack>
      <VisuallyHidden as="p" role="status" aria-live="polite">{note}</VisuallyHidden>
    </AppShell>
  );
}
