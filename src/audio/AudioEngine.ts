export interface AudioEngine {
  unlock(): void
  play(name: SoundName, opts?: { detune?: number; gain?: number }): void
  setMuted(muted: boolean): void
  setMasterGain(gain: number): void
  suspend(): void
  resume(): void
}

export type SoundName =
  | 'slide'
  | 'place'
  | 'flip'
  | 'invalid'
  | 'deal'
  | 'foundation'
  | 'win'
  | 'tick'
  | 'sparkle'

export class NullAudioEngine implements AudioEngine {
  unlock(): void {
    /* no-op */
  }
  play(_name: SoundName, _opts?: { detune?: number; gain?: number }): void {
    /* no-op */
  }
  setMuted(_muted: boolean): void {
    /* no-op */
  }
  setMasterGain(_gain: number): void {
    /* no-op */
  }
  suspend(): void {
    /* no-op */
  }
  resume(): void {
    /* no-op */
  }
}

let engine: AudioEngine = new NullAudioEngine()

export function getAudioEngine(): AudioEngine {
  return engine
}

export function setAudioEngine(next: AudioEngine): void {
  engine = next
}
