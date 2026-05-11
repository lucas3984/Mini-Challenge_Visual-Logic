/**
 * Procedural sound effects using the Web Audio API.
 * Lazy-initializes AudioContext on first user gesture to comply with browser autoplay policies.
 * Supports both preloaded audio files (HTMLAudioElement) and synthesized sounds (oscillator fallback).
 */
export class AudioFX {
  #ctx;
  #files;

  constructor() {
    this.#ctx = null;
    this.#files = {};
    // Lazy init: browsers block AudioContext creation before user gesture;
    // we defer until actual click/touch to avoid suspended context warnings
    const init = () => {
      if (!this.#ctx) {
        try { this.#ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (err) { console.warn('AudioContext not available — sounds disabled:', err); }
      }
    };
    // { once: true } because after the first gesture the context is valid forever
    document.addEventListener('click', init, { once: true });
    document.addEventListener('touchstart', init, { once: true });
  }

  /**
   * Play a named sound effect. Tries preloaded files first, falls back to synthesized tones.
   * Each case uses specific frequencies/durations chosen to sound distinct and non-fatiguing.
   * @param {string} name - sound identifier ('move', 'turn', 'eat', 'hit', 'win', 'snap', 'error')
   */
  play(name) {
    // Preloaded audio files take priority — faster and more natural sounding
    if (this.#files[name]) {
      this.#files[name].currentTime = 0;
      this.#files[name].play().catch(() => {});
      return;
    }
    // Without context, can't synthesize — early exit to avoid errors
    if (!this.#ctx) return;
    switch (name) {
      case 'move':  this.#beep(220, 0.05); break;
      case 'turn':  this.#sweep(300, 500, 0.08); break;
      case 'eat':
        this.#beep(800, 0.08);
        // Two-note "yum" effect via delayed second beep — more satisfying than a single tone
        setTimeout(() => this.#beep(1000, 0.06, 'sine', 0.06), 60);
        break;
      case 'hit':
        // Sawtooth waveform at low frequency sounds harsh/grating — signals danger clearly
        this.#beep(100, 0.2, 'sawtooth');
        break;
      case 'win':
        // Arpeggio of three ascending notes feels celebratory without being annoying
        this.#arpeggio();
        break;
      case 'snap':  this.#beep(1000, 0.03); break;
      case 'error':
        // Same harsh sawtooth as hit — negative sounds share a common character
        this.#beep(150, 0.15, 'sawtooth');
        break;
    }
  }

  /**
   * Play a single-frequency tone.
   * Gain envelope uses exponential ramp to avoid audible clicks/pops at note end.
   * @param {number} freq - frequency in Hz
   * @param {number} dur - duration in seconds
   * @param {string} type - oscillator waveform type
   * @param {number} delay - offset in seconds before the note starts
   */
  #beep(freq, dur, type = 'sine', delay = 0) {
    const osc = this.#ctx.createOscillator();
    const gain = this.#ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, this.#ctx.currentTime + delay);
    // Exponential ramp to near-zero avoids the click of an abrupt stop
    gain.gain.exponentialRampToValueAtTime(0.001, this.#ctx.currentTime + delay + dur);
    osc.connect(gain);
    gain.connect(this.#ctx.destination);
    osc.start(this.#ctx.currentTime + delay);
    osc.stop(this.#ctx.currentTime + delay + dur);
  }

  /**
   * Play a frequency sweep (glissando). Linear ramp between frequencies over duration.
   * @param {number} from - start frequency in Hz
   * @param {number} to - end frequency in Hz
   * @param {number} dur - duration in seconds
   */
  #sweep(from, to, dur) {
    const osc = this.#ctx.createOscillator();
    const gain = this.#ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, this.#ctx.currentTime);
    // Linear ramp creates a smooth slide rather than stepped pitch changes
    osc.frequency.linearRampToValueAtTime(to, this.#ctx.currentTime + dur);
    gain.gain.setValueAtTime(0.12, this.#ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.#ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.#ctx.destination);
    osc.start();
    osc.stop(this.#ctx.currentTime + dur);
  }

  /**
   * Play a three-note ascending arpeggio (C-E-G). Triangle waveform chosen for its softer,
   * more melodic timbre compared to sine — feels like a reward jingle.
   */
  #arpeggio() {
    [523, 659, 784].forEach((freq, i) => this.#beep(freq, 0.12, 'triangle', i * 0.1));
  }
}
