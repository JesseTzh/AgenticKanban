import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { applyThemeMode, nighttimeStartHour, daytimeStartHour, persistMode, readStoredMode, resolveTimeBasedThemeMode } from './theme'
import type { ThemeMode, ThemePreference } from './tokens'

type ThemeContextValue = {
  mode: ThemeMode
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredMode() ?? 'auto')
  const [autoMode, setAutoMode] = useState<ThemeMode>(() => resolveTimeBasedThemeMode())
  const mode = preference === 'auto' ? autoMode : preference

  useEffect(() => {
    applyThemeMode(mode)
  }, [mode])

  useEffect(() => {
    persistMode(preference)
  }, [preference])

  useEffect(() => {
    if (preference !== 'auto') return

    // Re-evaluate at the next local day/night boundary while the page remains open.
    let timeout: number | undefined
    const scheduleNextBoundary = () => {
      const now = new Date()
      const next = new Date(now)
      const hour = now.getHours()
      const nextHour = hour < daytimeStartHour ? daytimeStartHour : hour < nighttimeStartHour ? nighttimeStartHour : daytimeStartHour
      next.setHours(nextHour, 0, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      timeout = window.setTimeout(() => {
        setAutoMode(resolveTimeBasedThemeMode())
        scheduleNextBoundary()
      }, Math.max(1, next.getTime() - now.getTime() + 50))
    }

    setAutoMode(resolveTimeBasedThemeMode())
    scheduleNextBoundary()
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout)
    }
  }, [preference])

  function setPreference(nextPreference: ThemePreference) {
    setPreferenceState(nextPreference)
  }

  return <ThemeContext.Provider value={{ mode, preference, setPreference }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
