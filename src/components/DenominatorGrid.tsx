"use client";

import { fractionToNumber, type TimedEvent, type Voice } from "@/lib/rhythm";

interface DenominatorGridProps {
  voices: Voice[];
  eventsByVoice: TimedEvent[][];
  denominator: number;
  totalBeats: number;
  playheadBeat: number;
  mutedVoiceIds: string[];
  onToggleMute: (voiceId: string) => void;
}

export function DenominatorGrid({
  voices,
  eventsByVoice,
  denominator,
  totalBeats,
  playheadBeat,
  mutedVoiceIds,
  onToggleMute,
}: DenominatorGridProps) {
  const columns = Math.max(1, Math.ceil(totalBeats * denominator));
  const activeCol = Math.floor(playheadBeat * denominator);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-zinc-800">Denominator Grid</h2>
      <p className="mb-3 text-xs text-zinc-500">
        Columns: {columns} (base denominator {denominator})
      </p>
      <div className="space-y-2 overflow-x-auto pb-2">
        {voices.map((voice, voiceIndex) => {
          const isMuted = mutedVoiceIds.includes(voice.id);
          const cols = new Array(columns).fill(0).map((_, col) => {
            const beatAtCol = col / denominator;
            const isPlayhead = col === activeCol;
            const isQuarterBoundary = Math.abs(beatAtCol - Math.round(beatAtCol)) < 1e-8;
            const isEighthBoundary =
              !isQuarterBoundary &&
              Math.abs(beatAtCol * 2 - Math.round(beatAtCol * 2)) < 1e-8;
            const hasNoteStart = eventsByVoice[voiceIndex]?.some((event) => {
              const start = fractionToNumber(event.start);
              return !event.isRest && Math.abs(start - beatAtCol) < 1e-8;
            });
            const hasNoteBody = eventsByVoice[voiceIndex]?.some((event) => {
              const start = fractionToNumber(event.start);
              const end = start + fractionToNumber(event.duration);
              const cellEnd = (col + 1) / denominator;
              const overlaps = start < cellEnd && end > beatAtCol;
              return !event.isRest && overlaps;
            });
            return { isPlayhead, hasNoteStart, hasNoteBody, isQuarterBoundary, isEighthBoundary };
          });

          return (
            <div key={voice.id} className="grid items-center gap-2" style={{ gridTemplateColumns: "100px 1fr" }}>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={[
                    "rounded border px-1 py-0.5 text-[10px] leading-none",
                    isMuted
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-zinc-300 bg-white text-zinc-700",
                  ].join(" ")}
                  onClick={() => onToggleMute(voice.id)}
                  title={isMuted ? "Unmute voice" : "Mute voice"}
                >
                  {isMuted ? "M" : "S"}
                </button>
                <div className="truncate text-xs font-medium text-zinc-700">{voice.name}</div>
              </div>
              <div
                className="grid gap-px rounded border border-zinc-200 bg-zinc-200 p-px"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(8px, 1fr))` }}
              >
                {cols.map((col, idx) => (
                  <div
                    key={`${voice.id}-${idx}`}
                    className={[
                      "relative h-5",
                      col.isQuarterBoundary
                        ? "border-l-2 border-l-zinc-600"
                        : col.isEighthBoundary
                          ? "border-l border-l-dashed border-l-zinc-400"
                          : "",
                      col.isPlayhead
                        ? col.hasNoteStart
                          ? "bg-sky-600"
                          : col.hasNoteBody
                            ? "bg-sky-300"
                            : "bg-sky-100"
                        : col.hasNoteStart
                          ? "bg-zinc-900"
                          : col.hasNoteBody
                            ? "bg-zinc-400"
                            : "bg-white",
                    ].join(" ")}
                  >
                    {col.hasNoteStart ? (
                      <span className="absolute top-1/2 left-[2px] block h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber-300" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
