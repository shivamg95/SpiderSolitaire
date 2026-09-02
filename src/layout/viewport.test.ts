import { describe, expect, it } from 'vitest'
import { parseCssPx, readSafeInsets, readViewportSize } from './viewport'

describe('parseCssPx', () => {
  it('reads CSS pixel lengths and treats junk as zero', () => {
    expect(parseCssPx('44px')).toBe(44)
    expect(parseCssPx(' 12.5px')).toBe(12.5)
    expect(parseCssPx('')).toBe(0)
    expect(parseCssPx('auto')).toBe(0)
  })
})

describe('readSafeInsets', () => {
  it('reads the four safe-area CSS variables', () => {
    const values: Record<string, string> = {
      '--safe-top': '47px',
      '--safe-right': '0px',
      '--safe-bottom': '34px',
      '--safe-left': '8px',
    }
    expect(
      readSafeInsets({
        getPropertyValue: (name: string) => values[name] ?? '',
      }),
    ).toEqual({
      safeTop: 47,
      safeRight: 0,
      safeBottom: 34,
      safeLeft: 8,
    })
  })
})

describe('readViewportSize', () => {
  it('combines window size with safe-area insets', () => {
    expect(
      readViewportSize(
        { innerWidth: 390, innerHeight: 844 },
        {
          getPropertyValue: (name: string) => (name === '--safe-top' ? '54px' : '0px'),
        },
      ),
    ).toEqual({
      width: 390,
      height: 844,
      safeTop: 54,
      safeRight: 0,
      safeBottom: 0,
      safeLeft: 0,
    })
  })
})
