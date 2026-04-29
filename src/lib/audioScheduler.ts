import type { ScheduledEvent } from "@/lib/swing";
import type { SwingUnit } from "@/lib/rhythm";

export interface TransportConfig {
  bpm: number;
  speedMultiplier: number;
  metronome: "off" | "quarter" | "eighth" | "sixteenth";
  swingEnabled: boolean;
  swingPercent: number;
  swingUnit: SwingUnit;
}

export class AudioScheduler {
  private audioContext: AudioContext | null = null;
  private timeoutIds: number[] = [];

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new window.AudioContext();
    }
    return this.audioContext;
  }

  stop(): void {
    this.timeoutIds.forEach((id) => window.clearTimeout(id));
    this.timeoutIds = [];
  }

  schedule(
    eventsByVoice: ScheduledEvent[][],
    config: TransportConfig,
    onTick: (beat: number) => void,
    onDone: () => void,
  ): void {
    this.stop();
    const context = this.getContext();
    const effectiveBpm = Math.max(1, config.bpm * config.speedMultiplier);
    const secondsPerBeat = 60 / effectiveBpm;
    const startAt = context.currentTime + 0.005;

    let lastBeat = 0;
    for (const [voiceIndex, events] of eventsByVoice.entries()) {
      for (const event of events) {
        lastBeat = Math.max(lastBeat, event.swingStartBeats + event.swingDurationBeats);
        if (event.isRest) {
          continue;
        }
        const eventTime = startAt + event.swingStartBeats * secondsPerBeat;
        this.scheduleClick(context, eventTime, voiceIndex);
      }
    }
    this.scheduleMetronome(context, startAt, lastBeat, secondsPerBeat, config);

    const totalMs = lastBeat * secondsPerBeat * 1000;
    const tickIntervalMs = Math.max(15, secondsPerBeat * 1000 * 0.05);
    let elapsedMs = 0;
    const tickLoop = () => {
      elapsedMs += tickIntervalMs;
      onTick(Math.min(lastBeat, elapsedMs / 1000 / secondsPerBeat));
      if (elapsedMs < totalMs) {
        const id = window.setTimeout(tickLoop, tickIntervalMs);
        this.timeoutIds.push(id);
      }
    };

    const startTickId = window.setTimeout(tickLoop, 10);
    this.timeoutIds.push(startTickId);
    const endId = window.setTimeout(() => {
      this.stop();
      onTick(lastBeat);
      onDone();
    }, totalMs);
    this.timeoutIds.push(endId);
  }

  private scheduleClick(
    context: AudioContext,
    eventTime: number,
    voiceIndex: number,
  ): void {
    const osc = context.createOscillator();
    const gain = context.createGain();
    const timbreSet = [
      { type: "triangle" as OscillatorType, baseFreq: 520, gainPeak: 0.14, decay: 0.06 },
      { type: "square" as OscillatorType, baseFreq: 780, gainPeak: 0.12, decay: 0.05 },
      { type: "sawtooth" as OscillatorType, baseFreq: 360, gainPeak: 0.11, decay: 0.07 },
      { type: "sine" as OscillatorType, baseFreq: 980, gainPeak: 0.1, decay: 0.04 },
    ];
    const timbre = timbreSet[voiceIndex % timbreSet.length];
    const octaveShift = Math.floor(voiceIndex / timbreSet.length) * 110;
    osc.type = timbre.type;
    osc.frequency.setValueAtTime(timbre.baseFreq + octaveShift, eventTime);
    gain.gain.setValueAtTime(0.0001, eventTime);
    gain.gain.exponentialRampToValueAtTime(timbre.gainPeak, eventTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, eventTime + timbre.decay);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(eventTime);
    osc.stop(eventTime + timbre.decay + 0.01);
  }

  private scheduleMetronome(
    context: AudioContext,
    startAt: number,
    totalBeats: number,
    secondsPerBeat: number,
    config: TransportConfig,
  ): void {
    const unit = config.metronome;
    if (unit === "off" || totalBeats <= 0) {
      return;
    }
    const stepBeats = unit === "quarter" ? 1 : unit === "eighth" ? 0.5 : 0.25;
    const metronomeSwingUnit: SwingUnit | null =
      unit === "eighth" ? "eighth" : unit === "sixteenth" ? "sixteenth" : null;
    const swingApplies =
      !!metronomeSwingUnit &&
      config.swingEnabled &&
      config.swingUnit === metronomeSwingUnit &&
      config.swingPercent > 50;
    const swingAmount = Math.min(0.75, Math.max(0.5, config.swingPercent / 100));
    const pairLength = stepBeats * 2;
    const swingDelta = pairLength * (swingAmount - 0.5);
    const steps = Math.floor(totalBeats / stepBeats);
    for (let i = 0; i <= steps; i += 1) {
      let beat = i * stepBeats;
      if (swingApplies && i % 2 === 1) {
        beat += swingDelta;
      }
      const eventTime = startAt + beat * secondsPerBeat;
      const osc = context.createOscillator();
      const gain = context.createGain();
      const isQuarterBoundary = Math.abs(beat % 1) < 1e-6;
      osc.type = "sine";
      osc.frequency.setValueAtTime(isQuarterBoundary ? 1500 : 1150, eventTime);
      gain.gain.setValueAtTime(0.0001, eventTime);
      gain.gain.exponentialRampToValueAtTime(0.08, eventTime + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, eventTime + 0.03);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(eventTime);
      osc.stop(eventTime + 0.04);
    }
  }
}
