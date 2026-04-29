"use client";

import type { DurationName, RhythmToken, Voice } from "@/lib/rhythm";

const DURATION_OPTIONS: Array<{ label: string; value: DurationName }> = [
  { label: "1", value: "whole" },
  { label: "1/2", value: "half" },
  { label: "1/4", value: "quarter" },
  { label: "1/8", value: "eighth" },
  { label: "1/16", value: "sixteenth" },
  { label: "1/32", value: "thirtySecond" },
];

interface VoiceLaneProps {
  voice: Voice;
  onVoiceRename: (voiceId: string, name: string) => void;
  onTokenUpdate: (voiceId: string, tokenId: string, token: Partial<RhythmToken>) => void;
  onTokenAdd: (voiceId: string) => void;
  onTokenDuplicate: (voiceId: string, tokenId: string) => void;
  onTokenDelete: (voiceId: string, tokenId: string) => void;
  onVoiceDelete: (voiceId: string) => void;
}

export function VoiceLane({
  voice,
  onVoiceRename,
  onTokenUpdate,
  onTokenAdd,
  onTokenDuplicate,
  onTokenDelete,
  onVoiceDelete,
}: VoiceLaneProps) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-3 text-zinc-900 shadow-sm">
      <div className="flex items-center gap-2">
        <input
          className="w-44 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900"
          value={voice.name}
          onChange={(event) => onVoiceRename(voice.id, event.target.value)}
          aria-label="Voice name"
        />
        <button
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100"
          onClick={() => onTokenAdd(voice.id)}
          type="button"
        >
          + Note
        </button>
        <button
          className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
          onClick={() => onVoiceDelete(voice.id)}
          type="button"
        >
          Remove Voice
        </button>
      </div>
      <details className="mt-2" open>
        <summary className="cursor-pointer text-xs font-medium text-zinc-600">
          Note editor ({voice.tokens.length})
        </summary>
        <div className="mt-2 grid gap-2">
          {voice.tokens.map((token) => (
            <div
              key={token.id}
              className="grid items-center gap-1.5 rounded-md border border-zinc-200 p-2"
              style={{ gridTemplateColumns: "minmax(72px,1fr) auto auto auto auto auto" }}
            >
              <select
                className="rounded border border-zinc-300 bg-white px-1 py-1 text-sm text-zinc-900"
                value={token.duration}
                onChange={(event) =>
                  onTokenUpdate(voice.id, token.id, {
                    duration: event.target.value as DurationName,
                  })
                }
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={token.dotted}
                  onChange={(event) =>
                    onTokenUpdate(voice.id, token.id, { dotted: event.target.checked })
                  }
                />
                dot
              </label>
              <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={token.isRest}
                  onChange={(event) =>
                    onTokenUpdate(voice.id, token.id, { isRest: event.target.checked })
                  }
                />
                rest
              </label>
              <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                tup
                <input
                  type="number"
                  min={1}
                  className="w-12 rounded border border-zinc-300 bg-white px-1 py-1 text-xs text-zinc-900"
                  value={token.tuplet}
                  onChange={(event) =>
                    onTokenUpdate(voice.id, token.id, {
                      tuplet: Math.max(1, Number(event.target.value || 1)),
                    })
                  }
                />
              </label>
              <button
                className="justify-self-end rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100"
                onClick={() => onTokenDuplicate(voice.id, token.id)}
                type="button"
              >
                dup
              </button>
              <button
                className="justify-self-end rounded border border-zinc-300 px-2 py-1 text-xs leading-none hover:bg-zinc-100"
                onClick={() => onTokenDelete(voice.id, token.id)}
                type="button"
                title="Delete note"
                aria-label="Delete note"
              >
                x
              </button>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
