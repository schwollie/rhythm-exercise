import { describe, expect, it } from "vitest";
import { applySwingToEvents, type SwingConfig } from "./swing";
import {
  createDefaultToken,
  getGridDenominator,
  tokenDurationToBeats,
  voiceToTimedEvents,
  type Voice,
} from "./rhythm";

describe("rhythm model", () => {
  it("supports dotted durations", () => {
    const token = { ...createDefaultToken("a"), duration: "quarter" as const, dotted: true };
    const duration = tokenDurationToBeats(token);
    expect(duration.numerator).toBe(3);
    expect(duration.denominator).toBe(2);
  });

  it("supports arbitrary n-tuplet", () => {
    const token = { ...createDefaultToken("a"), duration: "quarter" as const, tuplet: 7 };
    const duration = tokenDurationToBeats(token);
    expect(duration.numerator).toBe(1);
    expect(duration.denominator).toBe(7);
  });

  it("computes denominator across polyrhythm voices", () => {
    const voiceA: Voice = {
      id: "a",
      name: "A",
      tokens: [
        { ...createDefaultToken("a1"), duration: "quarter", tuplet: 3, dotted: false, isRest: false },
      ],
    };
    const voiceB: Voice = {
      id: "b",
      name: "B",
      tokens: [
        { ...createDefaultToken("b1"), duration: "quarter", tuplet: 5, dotted: false, isRest: false },
      ],
    };
    const denominator = getGridDenominator([voiceToTimedEvents(voiceA), voiceToTimedEvents(voiceB)]);
    expect(denominator).toBe(15);
  });
});

describe("swing behavior", () => {
  it("does not swing tuplet events", () => {
    const voice: Voice = {
      id: "a",
      name: "A",
      tokens: [{ ...createDefaultToken("a1"), duration: "quarter", tuplet: 3 }],
    };
    const [event] = voiceToTimedEvents(voice);
    const cfg: SwingConfig = { enabled: true, percent: 66, unit: "eighth" };
    const [scheduled] = applySwingToEvents([event], cfg);
    expect(scheduled.swingStartBeats).toBeCloseTo(event.start.numerator / event.start.denominator);
  });
});
