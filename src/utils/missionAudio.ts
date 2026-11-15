class MissionAudioEngine {
  private ctx: AudioContext | null = null;
  private enabled = false;

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (next) {
      this.ensureCtx();
      if (this.ctx?.state === 'suspended') {
        void this.ctx.resume();
      }
      this.tone(660, 0.08, 'sine', 0.06);
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public playWaypointClick(): void {
    this.tone(620, 0.06, 'sine', 0.055);
  }

  public playLaunch(): void {
    this.tone(330, 0.14, 'triangle', 0.08);
    setTimeout(() => this.tone(495, 0.18, 'sine', 0.08), 80);
  }

  public playScan(): void {
    this.tone(880, 0.12, 'sine', 0.07);
  }

  public playSample(): void {
    this.tone(523.25, 0.1, 'sine', 0.07);
    setTimeout(() => this.tone(659.25, 0.16, 'sine', 0.07), 75);
  }

  public playSlipWarning(): void {
    this.tone(220, 0.16, 'sawtooth', 0.055);
  }

  public playOutcome(success: boolean): void {
    if (success) {
      this.tone(523.25, 0.14, 'sine', 0.08);
      setTimeout(() => this.tone(659.25, 0.16, 'sine', 0.08), 95);
      setTimeout(() => this.tone(783.99, 0.24, 'sine', 0.08), 190);
    } else {
      this.tone(246.94, 0.16, 'triangle', 0.08);
      setTimeout(() => this.tone(196.0, 0.24, 'triangle', 0.08), 110);
    }
  }

  private ensureCtx(): void {
    if (this.ctx || typeof window === 'undefined') return;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
  }

  private tone(freq: number, durSec: number, type: OscillatorType, vol: number): void {
    if (!this.enabled) return;
    this.ensureCtx();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durSec);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + durSec + 0.02);
  }
}

export const missionAudio = new MissionAudioEngine();
