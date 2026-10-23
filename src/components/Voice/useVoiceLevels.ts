import { useEffect, useRef, useState } from "react";

/*
 * Real levels for VoiceRecorder and AiVoiceConversation from a microphone stream (voice review R7, 2026-10-13): one level
 * every 1/7 s — the recorder's waveform speed, Figma's 56 bars being the 8-second window under it — read from an
 * AnalyserNode, so a real take scrolls like the sample does and every app's voice moves the same way.
 */

export type VoiceLevelsOptions = {
  /** How many levels to keep, oldest first: 56 for VoiceRecorder (Figma's 8-second window), 5 for AiVoiceConversation
   *  while listening (7 while responding). Default 56. */
  bars?: number;
  /** Levels a second. Default 7, the recorder's waveform speed. */
  rate?: number;
  /** Hold the levels still (a paused take): no new level comes in until it is false again. */
  paused?: boolean;
};

/** Silence and full scale in dBFS: a level is the frame's loudness between them. */
const FLOOR_DB = -60;

/** The loudness of one frame of samples, 0–1: its RMS in dBFS, from −60 (silence) to 0 (full scale). */
function levelOf(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  const db = 20 * Math.log10(Math.max(rms, 1e-8));
  return Math.max(0, Math.min(1, (db - FLOOR_DB) / -FLOOR_DB));
}

/**
 * The recent sound levels of a microphone stream (0–1 each, oldest first) for a Voice component's `levels`: start from
 * silence, then one level every 1/`rate` s while `paused` is false, the oldest dropped past `bars`. Undefined without a
 * stream (or without Web Audio), so the component keeps its sample or its flat Ready line. The audio is only read, never
 * played or recorded; the stream stays yours to stop.
 *
 * ```tsx
 * const levels = useVoiceLevels(stream, { paused: state === "paused" });
 * <VoiceRecorder state={state} levels={levels} … />
 * ```
 */
export function useVoiceLevels(stream: MediaStream | null | undefined, { bars = 56, rate = 7, paused = false }: VoiceLevelsOptions = {}): number[] | undefined {
  const [levels, setLevels] = useState<number[] | undefined>(undefined);
  // Read by the timer, so pausing holds the take without starting the audio graph again.
  const held = useRef(paused);
  held.current = paused;
  useEffect(() => {
    if (!stream || typeof window === "undefined" || typeof window.AudioContext === "undefined") {
      setLevels(undefined);
      return undefined;
    }
    const context = new window.AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    setLevels((current) => (current?.length === bars ? current : Array.from({ length: bars }, () => 0)));
    const timer = window.setInterval(() => {
      if (held.current) return;
      analyser.getFloatTimeDomainData(samples);
      const level = levelOf(samples);
      setLevels((current) => [...(current ?? []).slice(-(bars - 1)), level]);
    }, 1000 / Math.max(1, rate));
    return () => {
      window.clearInterval(timer);
      source.disconnect();
      void context.close();
    };
  }, [stream, bars, rate]);
  return levels;
}
