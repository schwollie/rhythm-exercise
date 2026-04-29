import { fractionToNumber, type SwingUnit, type TimedEvent } from "@/lib/rhythm";

export interface SwingConfig {
  enabled: boolean;
  percent: number;
  unit: SwingUnit;
}

export interface ScheduledEvent extends TimedEvent {
  swingStartBeats: number;
  swingDurationBeats: number;
}

function almostInteger(value: number): boolean {
  return Math.abs(value - Math.round(value)) < 1e-8;
}

function getSwingUnitBeatLength(unit: SwingUnit): number {
  return unit === "eighth" ? 0.5 : 0.25;
}

export function applySwingToEvents(
  events: TimedEvent[],
  config: SwingConfig,
): ScheduledEvent[] {
  const base = getSwingUnitBeatLength(config.unit);
  const amount = Math.min(0.75, Math.max(0.5, config.percent / 100));

  if (!config.enabled || amount === 0.5) {
    return events.map((event) => ({
      ...event,
      swingStartBeats: fractionToNumber(event.start),
      swingDurationBeats: fractionToNumber(event.duration),
    }));
  }

  return events.map((event) => {
    const start = fractionToNumber(event.start);
    const duration = fractionToNumber(event.duration);
    const pairLength = base * 2;
    const phase = start / base;
    const alignsToSwingGrid = almostInteger(phase);
    const eventEndsAt = start + duration;
    const endAligns = almostInteger(eventEndsAt / base);
    const isTupletEvent = event.tuplet > 1;

    if (!alignsToSwingGrid || !endAligns || isTupletEvent) {
      return {
        ...event,
        swingStartBeats: start,
        swingDurationBeats: duration,
      };
    }

    const pairIndex = Math.floor(start / pairLength);
    const pairStart = pairIndex * pairLength;
    const isSecondSubdivision = Math.floor((start - pairStart) / base) % 2 === 1;

    if (!isSecondSubdivision) {
      return {
        ...event,
        swingStartBeats: start,
        swingDurationBeats: duration,
      };
    }

    const delta = pairLength * (amount - 0.5);
    return {
      ...event,
      swingStartBeats: start + delta,
      swingDurationBeats: Math.max(0.0001, duration - delta),
    };
  });
}
