import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyThemeMode, darkModeQuery, persistMode, readStoredMode, resolveThemeMode } from './theme'
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
    const media = window.matchMedia(darkModeQuery)
    const updateFromSystem = (event: MediaQueryListEvent) => {
      if (!readStoredMode()) setMode(event.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', updateFromSystem)
    return () => media.removeEventListener('change', updateFromSystem)
  }, [])

  const value = useMemo(
    () => ({
      mode,
      toggleMode: () => {
        const nextMode = mode === 'dark' ? 'light' : 'dark'
        persistMode(nextMode)
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
