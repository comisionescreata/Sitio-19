class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainVal = 0.08
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  playShot(kind: string) {
    if (kind === 'cryo') {
      this.playTone(720, 320, 0.09, 'sine', 0.05);
    } else if (kind === 'pyro') {
      this.playTone(300, 110, 0.11, 'sawtooth', 0.045);
    } else if (kind === 'shotgun') {
      this.playTone(210, 55, 0.13, 'sawtooth', 0.075);
    } else if (kind === 'turret') {
      this.playTone(260, 90, 0.09, 'sawtooth', 0.06);
    } else if (kind === 'sniper') {
      this.playTone(620, 95, 0.14, 'sawtooth', 0.08);
    } else if (kind === 'heavy') {
      this.playTone(280, 110, 0.08, 'square', 0.055);
    } else if (kind === 'grenade') {
      this.playTone(190, 75, 0.16, 'triangle', 0.08);
    } else if (kind === 'psionic') {
      this.playTone(840, 420, 0.14, 'sine', 0.055);
    } else if (kind === 'mtf') {
      this.playTone(420, 150, 0.07, 'square', 0.045);
    } else {
      this.playTone(340, 140, 0.07, 'triangle', 0.05);
    }
  }

  playTeslaArc() {
    this.playTone(960, 260, 0.14, 'sawtooth', 0.055);
  }

  playPlace() {
    this.playTone(280, 460, 0.1, 'sine', 0.07);
  }

  playRemove() {
    this.playTone(240, 130, 0.09, 'triangle', 0.06);
  }

  playCollect() {
    this.playTone(540, 880, 0.12, 'sine', 0.08);
  }

  playExplosion() {
    this.playTone(140, 35, 0.32, 'sawtooth', 0.12);
  }

  playTesla() {
    this.playTone(880, 180, 0.35, 'sawtooth', 0.1);
  }

  playBlink() {
    this.playTone(180, 75, 0.1, 'sine', 0.05);
  }

  playRevive() {
    this.playTone(220, 440, 0.22, 'triangle', 0.06);
  }

  playHeal() {
    this.playTone(480, 660, 0.12, 'sine', 0.04);
  }

  playPull012() {
    this.playTone(380, 210, 0.2, 'sine', 0.06);
  }

  playScream096() {
    this.playTone(540, 190, 0.45, 'sawtooth', 0.1);
  }

  playVaseSpawn() {
    this.playTone(260, 410, 0.11, 'triangle', 0.04);
  }

  playPocket106() {
    this.playTone(120, 48, 0.34, 'sine', 0.09);
  }

  playScream066() {
    this.playTone(460, 640, 0.36, 'sawtooth', 0.085);
  }

  playDoor079() {
    this.playTone(160, 95, 0.14, 'square', 0.05);
  }

  playBounceImpact018() {
    this.playTone(920, 140, 0.18, 'triangle', 0.09);
  }

  playReptile682() {
    this.playTone(95, 42, 0.42, 'sawtooth', 0.11);
  }

  playFlagHorde() {
    this.playTone(320, 520, 0.28, 'sawtooth', 0.09);
  }

  playVictory() {
    this.playTone(523, 784, 0.28, 'sine', 0.09);
  }

  playGameOver() {
    this.playTone(220, 65, 0.45, 'sawtooth', 0.1);
  }
}

export const soundEngine = new SoundEngine();
