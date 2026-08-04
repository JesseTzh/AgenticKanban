import '@testing-library/jest-dom/vitest'
import { act, configure, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from './theme-provider'
import { ThemeToggle } from './theme-toggle'
import { applyThemeTokens, mergeThemeTokens, persistMode, readStoredMode, resolveThemeMode, resolveTimeBasedThemeMode, themeStorageKey } from './theme'
import { themes } from './themes'

configure({ testIdAttribute: 'data-testid' })

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

  it('uses the browser local time and ignores a previously persisted preference', () => {
    localStorage.setItem(themeStorageKey, 'light')
    expect(resolveTimeBasedThemeMode(new Date(2026, 0, 1, 5, 59))).toBe('dark')
    expect(resolveTimeBasedThemeMode(new Date(2026, 0, 1, 6, 0))).toBe('light')
    expect(resolveTimeBasedThemeMode(new Date(2026, 0, 1, 17, 59))).toBe('light')
    expect(resolveThemeMode(localStorage, undefined, new Date(2026, 0, 1, 18, 0))).toBe('dark')
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

  it('allows an explicit toggle and synchronizes root variables and class', () => {
    render(
      <ThemeProvider>
        <ThemeToggle dataTestId="test-theme-toggle" />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByTestId('test-theme-toggle'))

    expect(document.documentElement.style.getPropertyValue('--primary')).toBe(themes[document.documentElement.classList.contains('dark') ? 'dark' : 'light'].primary)
  })

  it('automatically updates when the browser clock reaches a day/night boundary', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1, 17, 59, 59, 900))
    render(
      <ThemeProvider>
        <ThemeToggle dataTestId="test-theme-toggle" />
      </ThemeProvider>,
    )

    act(() => vi.advanceTimersByTime(200))
    expect(document.documentElement).toHaveClass('dark')
    vi.useRealTimers()
  })
})
