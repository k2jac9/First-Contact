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
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public playWaypointClick(): void {
    this.tone(620, 0.05, 'sine', 0.04);
  }

  public playLaunch(): void {
    this.tone(330, 0.12, 'triangle', 0.06);
    setTimeout(() => this.tone(495, 0.16, 'sine', 0.06), 80);
  }

  public playScan(): void {
    this.tone(880, 0.11, 'sine', 0.05);
  }

  public playSample(): void {
    this.tone(523.25, 0.09, 'sine', 0.05);
    setTimeout(() => this.tone(659.25, 0.14, 'sine', 0.05), 75);
  }

  public playSlipWarning(): void {
    this.tone(196, 0.14, 'sawtooth', 0.035);
  }

  public playOutcome(success: boolean): void {
    if (success) {
      this.tone(523.25, 0.14, 'sine', 0.06);
      setTimeout(() => this.tone(659.25, 0.16, 'sine', 0.06), 95);
      setTimeout(() => this.tone(783.99, 0.24, 'sine', 0.06), 190);
    } else {
      this.tone(246.94, 0.16, 'triangle', 0.06);
      setTimeout(() => this.tone(196.0, 0.24, 'triangle', 0.06), 110);
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
