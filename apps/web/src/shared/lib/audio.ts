/** One synthesized note: a pitch glide with a short attack and a fade-out. */
type SoundNote = {
  /** Start and end pitch, Hz — a glide between them makes it sound alive (a meow falls, a chirp rises). */
  fromHz: number;
  toHz: number;
  durationMs: number;
  wave: OscillatorType;
  /** 0..1 */
  volume: number;
  /** Silence before this note, ms. */
  delayMs?: number;
  /** Optional low-pass cutoff, Hz — softens harsh waves. */
  lowpassHz?: number;
};

/** A sound defined as data, so skins can describe their own sounds without audio files. */
export type SoundSpec = readonly SoundNote[];

const ATTACK_S = 0.02;
let context: AudioContext | undefined;

function audioContext(): AudioContext | undefined {
  if (!context && typeof AudioContext !== 'undefined') {
    context = new AudioContext();
  }
  return context;
}

/**
 * Browsers only allow audio after a user gesture: call this from one (or let `unlockAudioOnFirstGesture` do it).
 */
export function unlockAudio(): void {
  void audioContext()?.resume();
}

/** Resumes audio on the first click or key press anywhere on the page. */
export function unlockAudioOnFirstGesture(): void {
  const unlock = (): void => {
    unlockAudio();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

/** Plays a sound; silently does nothing while audio is still locked or unavailable. */
export function playSound(spec: SoundSpec): void {
  const audio = audioContext();
  if (!audio || audio.state !== 'running') {
    return;
  }

  let start = audio.currentTime;
  for (const note of spec) {
    start += (note.delayMs ?? 0) / 1000;
    const end = start + note.durationMs / 1000;

    const oscillator = audio.createOscillator();
    oscillator.type = note.wave;
    oscillator.frequency.setValueAtTime(note.fromHz, start);
    oscillator.frequency.exponentialRampToValueAtTime(note.toHz, end);

    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(note.volume, start + ATTACK_S);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    let output: AudioNode = oscillator;
    if (note.lowpassHz) {
      const filter = audio.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = note.lowpassHz;
      oscillator.connect(filter);
      output = filter;
    }
    output.connect(gain).connect(audio.destination);

    oscillator.start(start);
    oscillator.stop(end + 0.05);
    start = end;
  }
}
