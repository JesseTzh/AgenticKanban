import '@testing-library/jest-dom/vitest'
import { act, configure, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from './theme-provider'
import { ThemeToggle } from './theme-toggle'
import { applyThemeTokens, darkModeQuery, mergeThemeTokens, persistMode, readStoredMode, resolveThemeMode, themeStorageKey } from './theme'
import { themes } from './themes'

configure({ testIdAttribute: 'data-test-id' })

function createMediaQuery(matches = false) {
  const listeners = new Set<EventListenerOrEventListenerObject>()
  const media = {
    get matches() {
      return matches
    },
    media: darkModeQuery,
    onchange: null,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.add(listener)
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.delete(listener)
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatch(nextMatches: boolean) {
      matches = nextMatches
      const event = { matches: nextMatches } as MediaQueryListEvent
      for (const listener of listeners) {
        if (typeof listener === 'function') listener(event)
        else listener.handleEvent(event)
      }
    },
    dispatchEvent: vi.fn(),
  }
  return media as unknown as MediaQueryList & { dispatch: (nextMatches: boolean) => void }
}

describe('theme runtime', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('style')
  })

  it('merges defined overrides without replacing defaults with undefined', () => {
    expect(mergeThemeTokens(themes.light, { primary: '#123456', radius: undefined })).toMatchObject({
      primary: '#123456',
      radius: themes.light.radius,
    })
  })

  it('applies theme variables to a supplied target element', () => {
    const target = document.createElement('section')

    applyThemeTokens(themes.dark, target)

    expect(target.style.getPropertyValue('--background')).toBe('#0e0e0e')
    expect(target.style.getPropertyValue('--material-shadow-card')).toBe(themes.dark.shadowCard)
  })

  it('prefers persisted mode and otherwise follows the system preference', () => {
    const darkMedia = createMediaQuery(true)

    expect(resolveThemeMode(localStorage, darkMedia)).toBe('dark')
    localStorage.setItem(themeStorageKey, 'light')
    expect(resolveThemeMode(localStorage, darkMedia)).toBe('light')
  })

  it('keeps theme handling usable when storage access is restricted', () => {
    const restrictedStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    } as unknown as Storage

    expect(readStoredMode(restrictedStorage)).toBeNull()
    expect(() => persistMode('dark', restrictedStorage)).not.toThrow()
  })

  it('persists an explicit toggle and synchronizes root variables and class', () => {
    const media = createMediaQuery(false)
    vi.stubGlobal('matchMedia', vi.fn(() => media))
    render(
      <ThemeProvider>
        <ThemeToggle dataTestId="test-theme-toggle" />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByTestId('test-theme-toggle'))

    expect(localStorage.getItem(themeStorageKey)).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe(themes.dark.primary)
  })

  it('responds to system preference changes until a user selection is stored', () => {
    const media = createMediaQuery(false)
    vi.stubGlobal('matchMedia', vi.fn(() => media))
    render(
      <ThemeProvider>
        <ThemeToggle dataTestId="test-theme-toggle" />
      </ThemeProvider>,
    )

    act(() => media.dispatch(true))
    expect(document.documentElement).toHaveClass('dark')

    fireEvent.click(screen.getByTestId('test-theme-toggle'))
    act(() => media.dispatch(true))
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
