/** A recorded sound, optionally cut to its first part with a fade-out. */
export type Sound = {
  /** URL of the recording, relative to the app base (`sounds/alert.mp3`). */
  url: string;
  /** Play only the first part of the recording… */
  maxDurationMs?: number;
  /** …fading out over its last milliseconds. */
  fadeOutMs?: number;
};

type PlayOptions = {
  /** Playback speed = pitch: a different "voice" per character (1 = as recorded). */
  pitchScale?: number;
};

let context: AudioContext | undefined;
/** Decoded recordings by URL; `null` = failed to load (then the sound is skipped). */
const recordings = new Map<string, Promise<AudioBuffer | null>>();
const unlockListeners = new Set<(unlocked: boolean) => void>();

function audioContext(): AudioContext | undefined {
  if (!context && typeof AudioContext !== 'undefined') {
    context = new AudioContext();
    context.addEventListener('statechange', () => {
      for (const listener of unlockListeners) {
        listener(isAudioUnlocked());
      }
    });
  }
  return context;
}

/** False until the page got a user gesture: browsers keep audio suspended and every sound is skipped until then. */
function isAudioUnlocked(): boolean {
  return context?.state === 'running';
}

/** Calls `listener` now and whenever the browser locks or unlocks audio. Returns the unsubscribe function. */
export function watchAudioUnlocked(listener: (unlocked: boolean) => void): () => void {
  listener(isAudioUnlocked());
  unlockListeners.add(listener);
  return () => unlockListeners.delete(listener);
}

function loadRecording(audio: AudioContext, url: string): Promise<AudioBuffer | null> {
  let recording = recordings.get(url);
  if (!recording) {
    recording = fetch(url)
      .then(response => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(String(response.status)))))
      .then(data => audio.decodeAudioData(data))
      .catch(() => null);
    recordings.set(url, recording);
  }
  return recording;
}

function playRecording(audio: AudioContext, buffer: AudioBuffer, sound: Sound, pitchScale: number): void {
  const start = audio.currentTime + 0.01;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  // Faster playback = a higher pitch: one recording, many voices.
  source.playbackRate.value = pitchScale;
  const gain = audio.createGain();
  source.connect(gain).connect(audio.destination);

  const naturalLength = buffer.duration / pitchScale;
  const length = sound.maxDurationMs ? Math.min(naturalLength, sound.maxDurationMs / 1000) : naturalLength;
  const fade = Math.min((sound.fadeOutMs ?? 0) / 1000, length);
  gain.gain.setValueAtTime(1, start);
  if (fade > 0) {
    gain.gain.setValueAtTime(1, start + length - fade);
    gain.gain.linearRampToValueAtTime(0, start + length);
  }
  source.start(start);
  source.stop(start + length + 0.02);
}

/** Starts downloading and decoding a recording ahead of time, so the first alert isn't late. */
export function preloadSound(sound: Sound): void {
  const audio = audioContext();
  if (audio) {
    void loadRecording(audio, sound.url);
  }
}

/**
 * Browsers only allow audio after a user gesture: call this from one (or let `unlockAudioOnFirstGesture` do it).
 */
export function unlockAudio(): Promise<void> {
  return audioContext()?.resume() ?? Promise.resolve();
}

/** Resumes audio on the first click or key press anywhere on the page. */
export function unlockAudioOnFirstGesture(): void {
  const unlock = (): void => {
    void unlockAudio();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

/** Plays a recording. Silently does nothing while audio is locked (no user gesture yet) or the file didn't load. */
export function playSound(sound: Sound, options: PlayOptions = {}): void {
  const audio = audioContext();
  if (!audio || audio.state !== 'running') {
    return;
  }
  const pitchScale = options.pitchScale ?? 1;
  void loadRecording(audio, sound.url).then(buffer => {
    if (buffer) {
      playRecording(audio, buffer, sound, pitchScale);
    }
  });
}
