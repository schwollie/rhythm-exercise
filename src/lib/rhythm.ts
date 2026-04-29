export type DurationName =
  | "whole"
  | "half"
  | "quarter"
  | "eighth"
  | "sixteenth"
  | "thirtySecond";

export type SwingUnit = "eighth" | "sixteenth";

export interface RhythmToken {
  id: string;
  duration: DurationName;
  isRest: boolean;
  dotted: boolean;
  tuplet: number;
}

export interface Voice {
  id: string;
  name: string;
  tokens: RhythmToken[];
}

export interface Fraction {
  numerator: number;
  denominator: number;
}

export interface TimedEvent {
  id: string;
  voiceId: string;
  tokenId: string;
  isRest: boolean;
  start: Fraction;
  duration: Fraction;
  tuplet: number;
}

const BASE_DURATION_TO_BEATS: Record<DurationName, Fraction> = {
  whole: { numerator: 4, denominator: 1 },
  half: { numerator: 2, denominator: 1 },
  quarter: { numerator: 1, denominator: 1 },
  eighth: { numerator: 1, denominator: 2 },
  sixteenth: { numerator: 1, denominator: 4 },
  thirtySecond: { numerator: 1, denominator: 8 },
};

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

export function simplifyFraction(fraction: Fraction): Fraction {
  if (fraction.denominator === 0) {
    throw new Error("Denominator cannot be zero.");
  }
  const sign = fraction.denominator < 0 ? -1 : 1;
  const n = fraction.numerator * sign;
  const d = fraction.denominator * sign;
  const div = gcd(n, d);
  return {
    numerator: n / div,
    denominator: d / div,
  };
}

export function addFractions(a: Fraction, b: Fraction): Fraction {
  const denominator = lcm(a.denominator, b.denominator);
  const sum =
    a.numerator * (denominator / a.denominator) +
    b.numerator * (denominator / b.denominator);
  return simplifyFraction({ numerator: sum, denominator });
}

export function multiplyFractions(a: Fraction, b: Fraction): Fraction {
  return simplifyFraction({
    numerator: a.numerator * b.numerator,
    denominator: a.denominator * b.denominator,
  });
}

export function fractionToNumber(value: Fraction): number {
  return value.numerator / value.denominator;
}

export function tokenDurationToBeats(token: RhythmToken): Fraction {
  const base = BASE_DURATION_TO_BEATS[token.duration];
  const dottedMultiplier = token.dotted
    ? { numerator: 3, denominator: 2 }
    : { numerator: 1, denominator: 1 };
  const tupletMultiplier = {
    numerator: 1,
    denominator: Math.max(1, Math.floor(token.tuplet)),
  };
  return multiplyFractions(multiplyFractions(base, dottedMultiplier), tupletMultiplier);
}

export function voiceToTimedEvents(voice: Voice): TimedEvent[] {
  let cursor: Fraction = { numerator: 0, denominator: 1 };
  return voice.tokens.map((token) => {
    const duration = tokenDurationToBeats(token);
    const event: TimedEvent = {
      id: `${voice.id}:${token.id}`,
      voiceId: voice.id,
      tokenId: token.id,
      isRest: token.isRest,
      start: cursor,
      duration,
      tuplet: Math.max(1, Math.floor(token.tuplet)),
    };
    cursor = addFractions(cursor, duration);
    return event;
  });
}

export function getVoiceLength(events: TimedEvent[]): Fraction {
  return events.reduce(
    (sum, event) => addFractions(sum, event.duration),
    { numerator: 0, denominator: 1 },
  );
}

export function getGridDenominator(eventsByVoice: TimedEvent[][]): number {
  let denominator = 1;
  for (const events of eventsByVoice) {
    for (const event of events) {
      denominator = lcm(denominator, event.start.denominator);
      denominator = lcm(denominator, event.duration.denominator);
    }
  }
  return denominator;
}

export function getCycleLength(eventsByVoice: TimedEvent[][]): Fraction {
  const lengths = eventsByVoice.map(getVoiceLength);
  if (lengths.length === 0) {
    return { numerator: 0, denominator: 1 };
  }
  return lengths.reduce((maxLen, current) => {
    const left = fractionToNumber(maxLen);
    const right = fractionToNumber(current);
    return right > left ? current : maxLen;
  });
}

export function createDefaultToken(id: string): RhythmToken {
  return {
    id,
    duration: "quarter",
    isRest: false,
    dotted: false,
    tuplet: 1,
  };
}
