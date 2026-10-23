/**
 * Voice proposals the user approved (2026-10-23, docs/research/voice-usability-review-2026-10-13.md): AiVoiceConversation
 * Thinking (A4), ChatVoice seeking (C3) and useVoiceLevels(stream) (R7).
 */
import { useEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { AiVoiceConversation, ChatMessage, ChatThread, ChatVoice, useVoiceLevels, ZenProvider } from "../../src/index";

describe("AiVoiceConversation: Thinking (A4)", () => {
  it("says it is thinking, rests the voice as dots and offers Interrupt", async () => {
    const onInterrupt = vi.fn();
    const screen = await render(<ZenProvider><AiVoiceConversation state="thinking" transcript="Move the review to eleven." onStart={() => {}} onDone={() => {}} onInterrupt={onInterrupt} onEnd={() => {}} /></ZenProvider>);
    await expect.element(screen.getByText("Thinking", { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByRole("heading", { name: "Thinking it through" })).toBeInTheDocument();
    await expect.element(screen.getByText("You · Said")).toBeInTheDocument();
    const signal = screen.container.querySelector(".zen-ai-voice__signal");
    expect(signal?.getAttribute("data-thinking")).toBe("true");
    expect(signal?.hasAttribute("data-live")).toBe(false);
    const dots = [...(signal?.querySelectorAll<HTMLElement>(".zen-ai-voice__level") ?? [])];
    expect(dots.length).toBe(5);
    expect(dots.every((dot) => dot.style.getPropertyValue("--zen-ai-voice-level") === "4px")).toBe(true);
    await screen.getByRole("button", { name: "Interrupt" }).click();
    expect(onInterrupt).toHaveBeenCalledTimes(1);
  });
});

function Seekable({ onSeek }: { onSeek: (share: number) => void }) {
  const [progress, setProgress] = useState(0.5);
  return (
    <ZenProvider>
      <ChatThread>
        <ChatMessage side="others" author={{ name: "Bao Tran" }}>
          <ChatVoice side="others" duration="0:32" elapsed="0:16" progress={progress} onSeek={(share) => { onSeek(share); setProgress(share); }} />
        </ChatMessage>
      </ChatThread>
    </ZenProvider>
  );
}

describe("ChatVoice: seeking (C3)", () => {
  it("is a named slider with keyboard steps when onSeek is set", async () => {
    const onSeek = vi.fn();
    const screen = await render(<Seekable onSeek={onSeek} />);
    const slider = screen.getByRole("slider", { name: "Playback position" });
    await expect.element(slider).toHaveAttribute("aria-valuenow", "50");
    await expect.element(slider).toHaveAttribute("aria-valuetext", "0:16 of 0:32");
    (slider.element() as HTMLElement).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onSeek).toHaveBeenLastCalledWith(0.55);
    await userEvent.keyboard("{Home}");
    expect(onSeek).toHaveBeenLastCalledWith(0);
    await userEvent.keyboard("{End}");
    expect(onSeek).toHaveBeenLastCalledWith(1);
  });

  it("seeks to the share under the pointer", async () => {
    const onSeek = vi.fn();
    const screen = await render(<Seekable onSeek={onSeek} />);
    const wave = screen.getByRole("slider", { name: "Playback position" }).element() as HTMLElement;
    const box = wave.getBoundingClientRect();
    await userEvent.click(wave, { position: { x: box.width * 0.75, y: box.height / 2 } });
    await vi.waitFor(() => expect(onSeek).toHaveBeenCalled());
    expect(onSeek.mock.lastCall?.[0]).toBeGreaterThan(0.7);
    expect(onSeek.mock.lastCall?.[0]).toBeLessThan(0.8);
  });

  it("stays a decorative waveform without onSeek", async () => {
    const screen = await render(<ZenProvider><ChatThread><ChatMessage side="others" author={{ name: "Bao Tran" }}><ChatVoice side="others" duration="0:32" /></ChatMessage></ChatThread></ZenProvider>);
    expect(screen.container.querySelector('[role="slider"]')).toBeNull();
    expect(screen.container.querySelector(".zen-chat-voice__wave")?.getAttribute("aria-hidden")).toBe("true");
  });
});

/** A tone as a microphone: an oscillator into a MediaStream, the levels the hook reads from it. */
function Tone({ paused = false, onLevels }: { paused?: boolean; onLevels: (levels: number[] | undefined) => void }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  useEffect(() => {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0.5;
    const out = context.createMediaStreamDestination();
    oscillator.connect(gain).connect(out);
    oscillator.start();
    void context.resume();
    setStream(out.stream);
    return () => { oscillator.stop(); void context.close(); };
  }, []);
  const levels = useVoiceLevels(stream, { bars: 10, rate: 20, paused });
  useEffect(() => onLevels(levels), [levels, onLevels]);
  return null;
}

describe("useVoiceLevels (R7)", () => {
  it("is undefined without a stream", async () => {
    let seen: number[] | undefined = [1];
    function Without() { seen = useVoiceLevels(null); return null; }
    await render(<Without />);
    expect(seen).toBeUndefined();
  });

  it("keeps `bars` levels from the stream, loud for a tone", async () => {
    let latest: number[] | undefined;
    await render(<Tone onLevels={(levels) => { latest = levels; }} />);
    await vi.waitFor(() => {
      expect(latest?.length).toBe(10);
      expect(Math.max(...(latest ?? [0]))).toBeGreaterThan(0.5);
    }, { timeout: 4000 });
    expect((latest ?? []).every((level) => level >= 0 && level <= 1)).toBe(true);
  });
});
