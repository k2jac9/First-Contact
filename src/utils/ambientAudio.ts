import { SceneKind } from '../data/storyboard';

/**
 * Procedural Web Audio score generator matching the film's audio direction:
 * - Earth: low atmospheric drone
 * - Moon: restrained pulse + clean telemetry cue (no wind or engine sound)
 * - Mars Failure: tonal tension drop at stall
 * - Atlas / Generative / Training: subtle precision cues
 * - Mars Retry / Title: warm orchestral-synth resolution chord
 */
class ConceptScoreEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private harmonicOsc: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private enabled = false;
  private lastScene: SceneKind | null = null;

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (next) {
      this.ensureContext();
      if (this.ctx?.state === 'suspended') {
        void this.ctx.resume();
      }
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0.26, this.ctx.currentTime, 0.15);
        this.triggerCue(523.25, 0.16);
      }
    } else if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.12);
    }
  }

  public updateForScene(kind: SceneKind): void {
    if (!this.enabled) {
      this.lastScene = kind;
      return;
    }
    this.ensureContext();
    if (!this.ctx || !this.droneOsc || !this.harmonicOsc || !this.filter) return;

    const now = this.ctx.currentTime;
    const isTransition = this.lastScene !== kind;
    this.lastScene = kind;

    switch (kind) {
      case 'earth':
        this.droneOsc.frequency.setTargetAtTime(130.81, now, 0.5); // C3
        this.harmonicOsc.frequency.setTargetAtTime(196.0, now, 0.5); // G3
        this.filter.frequency.setTargetAtTime(580, now, 0.4);
        break;
      case 'moon':
        this.droneOsc.frequency.setTargetAtTime(146.83, now, 0.5); // D3
        this.harmonicOsc.frequency.setTargetAtTime(220.0, now, 0.5); // A3
        this.filter.frequency.setTargetAtTime(640, now, 0.4);
        if (isTransition) this.triggerCue(880, 0.12);
        break;
      case 'mars-failure':
        this.droneOsc.frequency.setTargetAtTime(116.54, now, 0.4); // Bb2 tension
        this.harmonicOsc.frequency.setTargetAtTime(174.61, now, 0.4); // F3
        this.filter.frequency.setTargetAtTime(420, now, 0.4);
        if (isTransition) this.triggerCue(311.13, 0.16);
        break;
      case 'atlas':
        this.droneOsc.frequency.setTargetAtTime(130.81, now, 0.4);
        this.harmonicOsc.frequency.setTargetAtTime(261.63, now, 0.4); // C4
        this.filter.frequency.setTargetAtTime(720, now, 0.4);
        if (isTransition) this.triggerCue(1046.5, 0.08);
        break;
      case 'generative':
        this.droneOsc.frequency.setTargetAtTime(146.83, now, 0.4);
        this.harmonicOsc.frequency.setTargetAtTime(293.66, now, 0.4); // D4
        this.filter.frequency.setTargetAtTime(780, now, 0.4);
        if (isTransition) this.triggerCue(783.99, 0.09);
        break;
      case 'training':
        this.droneOsc.frequency.setTargetAtTime(164.81, now, 0.4); // E3
        this.harmonicOsc.frequency.setTargetAtTime(329.63, now, 0.4); // E4
        this.filter.frequency.setTargetAtTime(840, now, 0.4);
        break;
      case 'mars-retry':
        this.droneOsc.frequency.setTargetAtTime(130.81, now, 0.5); // C3 resolution
        this.harmonicOsc.frequency.setTargetAtTime(392.0, now, 0.6); // G4
        this.filter.frequency.setTargetAtTime(920, now, 0.6);
        if (isTransition) this.triggerCue(523.25, 0.18);
        break;
      case 'title':
        this.droneOsc.frequency.setTargetAtTime(130.81, now, 0.8);
        this.harmonicOsc.frequency.setTargetAtTime(261.63, now, 0.8);
        this.filter.frequency.setTargetAtTime(440, now, 1.0);
        break;
    }
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
      this.droneOsc = null;
      this.harmonicOsc = null;
      this.filter = null;
    }
  }

  private ensureContext(): void {
    if (this.ctx || typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 580;

    const droneOsc = ctx.createOscillator();
    droneOsc.type = 'triangle';
    droneOsc.frequency.value = 130.81;

    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.28;

    const harmonicOsc = ctx.createOscillator();
    harmonicOsc.type = 'sine';
    harmonicOsc.frequency.value = 196.0;

    const harmonicGain = ctx.createGain();
    harmonicGain.gain.value = 0.24;

    droneOsc.connect(droneGain);
    harmonicOsc.connect(harmonicGain);
    droneGain.connect(filter);
    harmonicGain.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    droneOsc.start();
    harmonicOsc.start();

    this.ctx = ctx;
    this.masterGain = masterGain;
    this.filter = filter;
    this.droneOsc = droneOsc;
    this.harmonicOsc = harmonicOsc;
  }

  private triggerCue(freq: number, durSec: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durSec);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + durSec + 0.02);
  }
}

export const conceptScore = new ConceptScoreEngine();
