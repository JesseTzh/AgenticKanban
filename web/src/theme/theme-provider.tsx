import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyThemeMode, nighttimeStartHour, daytimeStartHour, resolveThemeMode } from './theme'
import type { ThemeMode } from './tokens'

type ThemeContextValue = {
  mode: ThemeMode
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => resolveThemeMode())

  useEffect(() => {
    applyThemeMode(mode)
  }, [mode])

  useEffect(() => {
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
        setMode(resolveThemeMode())
        scheduleNextBoundary()
      }, Math.max(1, next.getTime() - now.getTime() + 50))
    }

    scheduleNextBoundary()
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout)
    }
  }, [])

  const value = useMemo(
    () => ({
      mode,
      toggleMode: () => {
        const nextMode = mode === 'dark' ? 'light' : 'dark'
        setMode(nextMode)
      },
    }),
    [mode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
