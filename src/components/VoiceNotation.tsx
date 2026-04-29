"use client";

import { useEffect, useRef, useState } from "react";
import {
  Beam,
  Dot,
  Fraction,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  Tuplet,
  Voice as VexVoice,
} from "vexflow";
import type { DurationName, Voice } from "@/lib/rhythm";

interface VoiceNotationProps {
  voice: Voice;
  totalBeats: number;
  denominator: number;
}

function durationToVex(duration: DurationName): string {
  switch (duration) {
    case "whole":
      return "w";
    case "half":
      return "h";
    case "quarter":
      return "q";
    case "eighth":
      return "8";
    case "sixteenth":
      return "16";
    case "thirtySecond":
      return "32";
  }
}

function shortenDurationForTuplet(duration: DurationName): string {
  switch (duration) {
    case "whole":
      return "h";
    case "half":
      return "q";
    case "quarter":
      return "8";
    case "eighth":
      return "16";
    case "sixteenth":
      return "32";
    case "thirtySecond":
      return "64";
  }
}

export function VoiceNotation({ voice, totalBeats, denominator }: VoiceNotationProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [availableWidth, setAvailableWidth] = useState(0);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver(() => {
      setAvailableWidth(wrapper.clientWidth);
    });
    observer.observe(wrapper);
    setAvailableWidth(wrapper.clientWidth);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    const timelineColumns = Math.max(1, Math.ceil(totalBeats * denominator));
    const idealWidth = Math.max(340, 80 + timelineColumns * 16);
    const width = availableWidth > 0 ? Math.max(320, Math.min(idealWidth, availableWidth - 6)) : idealWidth;
    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(width, 124);
    const context = renderer.getContext();

    const stave = new Stave(10, 14, width - 20);
    stave.addClef("treble");
    stave.setContext(context).draw();

    const notes = voice.tokens.map((token) => {
      const glyphDuration =
        token.tuplet > 1
          ? shortenDurationForTuplet(token.duration)
          : durationToVex(token.duration);
      const duration = `${glyphDuration}${token.isRest ? "r" : ""}`;
      const note = new StaveNote({
        keys: [token.isRest ? "b/4" : "c/4"],
        duration,
      });
      if (token.dotted) {
        Dot.buildAndAttach([note], { all: true });
      }
      return note;
    });

    const tuplets: Tuplet[] = [];
    let runStart = 0;
    while (runStart < voice.tokens.length) {
      const tupletValue = voice.tokens[runStart].tuplet;
      if (tupletValue <= 1) {
        runStart += 1;
        continue;
      }
      let runEnd = runStart + 1;
      while (runEnd < voice.tokens.length && voice.tokens[runEnd].tuplet === tupletValue) {
        runEnd += 1;
      }
      for (let i = runStart; i < runEnd; i += tupletValue) {
        const chunk = notes.slice(i, Math.min(runEnd, i + tupletValue));
        if (chunk.length >= 2) {
          tuplets.push(
            new Tuplet(chunk, {
              numNotes: tupletValue,
              notesOccupied: 2,
              bracketed: true,
              ratioed: tupletValue !== 3,
            }),
          );
        }
      }
      runStart = runEnd;
    }

    const beams = Beam.generateBeams(notes, {
      beamRests: false,
      groups: [new Fraction(1, 4)],
    });

    const v = new VexVoice({ numBeats: 4, beatValue: 4 });
    v.setStrict(false);
    v.addTickables(notes);
    new Formatter().joinVoices([v]).format([v], width - 100);
    v.draw(context, stave);
    beams.forEach((beam) => beam.setContext(context).draw());
    tuplets.forEach((tuplet) => tuplet.setContext(context).draw());
  }, [voice, totalBeats, denominator, availableWidth]);

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-2 pt-1">
      <div className="mb-0 text-[11px] leading-none text-zinc-500">Notation</div>
      <div className="min-h-[124px] overflow-hidden" ref={wrapperRef}>
        <div ref={containerRef} />
      </div>
    </div>
  );
}
