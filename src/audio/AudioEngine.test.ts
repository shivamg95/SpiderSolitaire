import { describe, expect, it } from 'vitest'
import { NullAudioEngine, getAudioEngine, setAudioEngine } from './AudioEngine'

describe('NullAudioEngine', () => {
  it('is safe to call', () => {
    const audio = new NullAudioEngine()
    audio.unlock()
    audio.play('flip')
    audio.setMuted(true)
    audio.setMasterGain(0.5)
    audio.suspend()
    audio.resume()
    setAudioEngine(audio)
    expect(getAudioEngine()).toBe(audio)
  })
})
