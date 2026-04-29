"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DenominatorGrid } from "@/components/DenominatorGrid";
import { VoiceNotation } from "@/components/VoiceNotation";
import { VoiceLane } from "@/components/VoiceLane";
import { AudioScheduler } from "@/lib/audioScheduler";
import {
  createDefaultToken,
  getCycleLength,
  getGridDenominator,
  type RhythmToken,
  type SwingUnit,
  type Voice,
  voiceToTimedEvents,
} from "@/lib/rhythm";
import type { ScheduledEvent } from "@/lib/swing";
import { applySwingToEvents } from "@/lib/swing";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function makeVoice(index: number): Voice {
  return {
    id: uid(),
    name: `Voice ${index + 1}`,
    tokens: [createDefaultToken(uid())],
  };
}

const STORAGE_KEY = "polyrhythm-trainer-v1";

interface PersistedState {
  voices: Voice[];
  mutedVoiceIds: string[];
  bpm: number;
  speedMultiplier: number;
  repeatPlayback: boolean;
  metronome: "off" | "quarter" | "eighth" | "sixteenth";
  swingEnabled: boolean;
  swingPercent: number;
  swingUnit: SwingUnit;
}

export function RhythmEditor() {
  const [voices, setVoices] = useState<Voice[]>([makeVoice(0), makeVoice(1)]);
  const [mutedVoiceIds, setMutedVoiceIds] = useState<string[]>([]);
  const [bpm, setBpm] = useState(90);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [repeatPlayback, setRepeatPlayback] = useState(false);
  const [metronome, setMetronome] = useState<"off" | "quarter" | "eighth" | "sixteenth">("off");
  const [swingEnabled, setSwingEnabled] = useState(false);
  const [swingPercent, setSwingPercent] = useState(60);
  const [swingUnit, setSwingUnit] = useState<SwingUnit>("eighth");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadBeat, setPlayheadBeat] = useState(0);
  const schedulerRef = useRef(new AudioScheduler());
  const repeatRef = useRef(repeatPlayback);
  const cycleEventsRef = useRef<ScheduledEvent[][]>([]);
  const transportRef = useRef({
    bpm,
    speedMultiplier,
    metronome,
    swingEnabled,
    swingPercent,
    swingUnit,
  });

  const eventsByVoice = useMemo(() => voices.map(voiceToTimedEvents), [voices]);
  const denominator = useMemo(() => getGridDenominator(eventsByVoice), [eventsByVoice]);
  const cycleLength = useMemo(() => getCycleLength(eventsByVoice), [eventsByVoice]);
  const totalBeats = useMemo(
    () => cycleLength.numerator / cycleLength.denominator,
    [cycleLength],
  );

  const scheduledByVoice = useMemo(
    () =>
      eventsByVoice.map((events) =>
        applySwingToEvents(events, {
          enabled: swingEnabled,
          percent: swingPercent,
          unit: swingUnit,
        }),
      ),
    [eventsByVoice, swingEnabled, swingPercent, swingUnit],
  );
  const audibleScheduledByVoice = useMemo(
    () =>
      scheduledByVoice.map((events, index) => {
        const voiceId = voices[index]?.id;
        if (!voiceId || !mutedVoiceIds.includes(voiceId)) {
          return events;
        }
        return events.map((event) => ({ ...event, isRest: true }));
      }),
    [scheduledByVoice, voices, mutedVoiceIds],
  );

  useEffect(() => {
    repeatRef.current = repeatPlayback;
  }, [repeatPlayback]);

  useEffect(() => {
    cycleEventsRef.current = audibleScheduledByVoice;
  }, [audibleScheduledByVoice]);

  useEffect(() => {
    transportRef.current = {
      bpm,
      speedMultiplier,
      metronome,
      swingEnabled,
      swingPercent,
      swingUnit,
    };
  }, [bpm, speedMultiplier, metronome, swingEnabled, swingPercent, swingUnit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      /* eslint-disable react-hooks/set-state-in-effect */
      if (parsed.voices && parsed.voices.length > 0) setVoices(parsed.voices);
      if (Array.isArray(parsed.mutedVoiceIds)) setMutedVoiceIds(parsed.mutedVoiceIds);
      if (typeof parsed.bpm === "number") setBpm(parsed.bpm);
      if (typeof parsed.speedMultiplier === "number") setSpeedMultiplier(parsed.speedMultiplier);
      if (typeof parsed.repeatPlayback === "boolean") setRepeatPlayback(parsed.repeatPlayback);
      if (
        parsed.metronome === "off" ||
        parsed.metronome === "quarter" ||
        parsed.metronome === "eighth" ||
        parsed.metronome === "sixteenth"
      ) {
        setMetronome(parsed.metronome);
      }
      if (typeof parsed.swingEnabled === "boolean") setSwingEnabled(parsed.swingEnabled);
      if (typeof parsed.swingPercent === "number") setSwingPercent(parsed.swingPercent);
      if (parsed.swingUnit === "eighth" || parsed.swingUnit === "sixteenth") {
        setSwingUnit(parsed.swingUnit);
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // Ignore invalid local storage payload.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: PersistedState = {
      voices,
      mutedVoiceIds,
      bpm,
      speedMultiplier,
      repeatPlayback,
      metronome,
      swingEnabled,
      swingPercent,
      swingUnit,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    voices,
    mutedVoiceIds,
    bpm,
    speedMultiplier,
    repeatPlayback,
    metronome,
    swingEnabled,
    swingPercent,
    swingUnit,
  ]);

  function updateVoice(voiceId: string, patch: Partial<Voice>) {
    setVoices((prev) => prev.map((voice) => (voice.id === voiceId ? { ...voice, ...patch } : voice)));
  }

  function updateToken(voiceId: string, tokenId: string, patch: Partial<RhythmToken>) {
    setVoices((prev) =>
      prev.map((voice) =>
        voice.id !== voiceId
          ? voice
          : {
              ...voice,
              tokens: voice.tokens.map((token) =>
                token.id === tokenId ? { ...token, ...patch } : token,
              ),
            },
      ),
    );
  }

  function addToken(voiceId: string) {
    setVoices((prev) =>
      prev.map((voice) =>
        voice.id === voiceId
          ? { ...voice, tokens: [...voice.tokens, createDefaultToken(uid())] }
          : voice,
      ),
    );
  }

  function deleteToken(voiceId: string, tokenId: string) {
    setVoices((prev) =>
      prev.map((voice) =>
        voice.id !== voiceId
          ? voice
          : { ...voice, tokens: voice.tokens.filter((token) => token.id !== tokenId) },
      ),
    );
  }

  function duplicateToken(voiceId: string, tokenId: string) {
    setVoices((prev) =>
      prev.map((voice) => {
        if (voice.id !== voiceId) return voice;
        const idx = voice.tokens.findIndex((token) => token.id === tokenId);
        if (idx < 0) return voice;
        const source = voice.tokens[idx];
        const copy: RhythmToken = { ...source, id: uid() };
        const nextTokens = [...voice.tokens];
        nextTokens.splice(idx + 1, 0, copy);
        return { ...voice, tokens: nextTokens };
      }),
    );
  }

  function addVoice() {
    setVoices((prev) => [...prev, makeVoice(prev.length)]);
  }

  function deleteVoice(voiceId: string) {
    setVoices((prev) => prev.filter((voice) => voice.id !== voiceId));
    setMutedVoiceIds((prev) => prev.filter((id) => id !== voiceId));
  }

  function toggleVoiceMute(voiceId: string) {
    setMutedVoiceIds((prev) =>
      prev.includes(voiceId) ? prev.filter((id) => id !== voiceId) : [...prev, voiceId],
    );
  }

  function stopPlayback() {
    schedulerRef.current.stop();
    setIsPlaying(false);
    setPlayheadBeat(0);
  }

  function play() {
    if (audibleScheduledByVoice.length === 0 && cycleEventsRef.current.length === 0) return;
    setIsPlaying(true);
    setPlayheadBeat(0);
    const runCycle = () => {
      const currentEvents =
        cycleEventsRef.current.length > 0 ? cycleEventsRef.current : audibleScheduledByVoice;
      if (currentEvents.length === 0) {
        setIsPlaying(false);
        return;
      }
      schedulerRef.current.schedule(
        currentEvents,
        transportRef.current,
        (beat) => setPlayheadBeat(beat),
        () => {
          if (repeatRef.current) {
            setPlayheadBeat(0);
            runCycle();
            return;
          }
          setIsPlaying(false);
        },
      );
    };
    runCycle();
  }

  return (
    <div className="mx-auto flex w-full max-w-[98vw] flex-col gap-3 px-1 py-3 sm:px-2">
      <section className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm">
        <h1 className="mb-4 text-2xl font-semibold text-zinc-900">Polyrhythm Trainer</h1>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-zinc-800">
            BPM
            <input
              type="number"
              min={20}
              max={320}
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900"
              value={bpm}
              onChange={(event) => setBpm(Math.max(20, Number(event.target.value || 20)))}
            />
          </label>
          <label className="text-sm text-zinc-800">
            Practice speed ({Math.round(speedMultiplier * 100)}%)
            <input
              type="range"
              min={0.4}
              max={1.6}
              step={0.05}
              className="mt-2 w-full"
              value={speedMultiplier}
              onChange={(event) => setSpeedMultiplier(Number(event.target.value))}
            />
          </label>
          <label className="text-sm text-zinc-800">
            Metronome
            <select
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900"
              value={metronome}
              onChange={(event) =>
                setMetronome(event.target.value as "off" | "quarter" | "eighth" | "sixteenth")
              }
            >
              <option value="off">Off</option>
              <option value="quarter">Quarter</option>
              <option value="eighth">Eighth</option>
              <option value="sixteenth">Sixteenth</option>
            </select>
          </label>
          <label className="text-sm text-zinc-800">
            Swing percent ({swingPercent}%)
            <input
              type="range"
              min={50}
              max={75}
              step={1}
              className="mt-2 w-full"
              value={swingPercent}
              onChange={(event) => setSwingPercent(Number(event.target.value))}
              disabled={!swingEnabled}
            />
          </label>
          <div className="text-sm text-zinc-800">
            <div className="mb-2 flex items-center gap-2">
              <input
                id="swingEnabled"
                type="checkbox"
                checked={swingEnabled}
                onChange={(event) => setSwingEnabled(event.target.checked)}
              />
              <label htmlFor="swingEnabled">Enable swing</label>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="swingUnit"
                  checked={swingUnit === "eighth"}
                  onChange={() => setSwingUnit("eighth")}
                />
                8th
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="swingUnit"
                  checked={swingUnit === "sixteenth"}
                  onChange={() => setSwingUnit("sixteenth")}
                />
                16th
              </label>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100"
            onClick={addVoice}
          >
            + Voice
          </button>
        </div>
      </section>

      <section className="grid gap-2">
        {voices.map((voice) => (
          <div
            key={voice.id}
            className="grid gap-2 lg:grid-cols-[minmax(560px,1.45fr)_minmax(280px,0.8fr)] lg:items-start"
          >
            <VoiceNotation voice={voice} totalBeats={totalBeats} denominator={denominator} />
            <VoiceLane
              voice={voice}
              onVoiceRename={(voiceId, name) => updateVoice(voiceId, { name })}
              onTokenUpdate={updateToken}
              onTokenAdd={addToken}
              onTokenDuplicate={duplicateToken}
              onTokenDelete={deleteToken}
              onVoiceDelete={deleteVoice}
            />
          </div>
        ))}
      </section>

      <DenominatorGrid
        voices={voices}
        eventsByVoice={eventsByVoice}
        denominator={denominator}
        totalBeats={totalBeats}
        playheadBeat={playheadBeat}
        mutedVoiceIds={mutedVoiceIds}
        onToggleMute={toggleVoiceMute}
      />
      <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700"
            onClick={isPlaying ? stopPlayback : play}
          >
            {isPlaying ? "Stop" : "Play"}
          </button>
          <label className="flex items-center gap-1 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={repeatPlayback}
              onChange={(event) => setRepeatPlayback(event.target.checked)}
            />
            Repeat
          </label>
          <span className="text-xs text-zinc-500">
            Effective BPM: {Math.round(bpm * speedMultiplier)}
          </span>
        </div>
      </section>
    </div>
  );
}
