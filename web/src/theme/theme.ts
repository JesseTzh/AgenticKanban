import { themes } from './themes'
import { themeTokenVariables, type ThemeMode, type ThemeOverrides, type ThemeTokens } from './tokens'

export const themeStorageKey = 'agentic-kanban-theme'
export const darkModeQuery = '(prefers-color-scheme: dark)'

export function mergeThemeTokens(defaults: ThemeTokens, overrides: ThemeOverrides = {}): ThemeTokens {
  const merged = { ...defaults }
  for (const key of Object.keys(themeTokenVariables) as (keyof ThemeTokens)[]) {
    if (overrides[key] !== undefined) merged[key] = overrides[key]
  }
  return merged
}

export function applyThemeTokens(tokens: ThemeTokens, root = document.documentElement) {
  for (const key of Object.keys(themeTokenVariables) as (keyof ThemeTokens)[]) {
    root.style.setProperty(themeTokenVariables[key], tokens[key])
  }
}

export function readStoredMode(storage?: Storage): ThemeMode | null {
  try {
    const mode = (storage ?? window.localStorage).getItem(themeStorageKey)
    return mode === 'light' || mode === 'dark' ? mode : null
  } catch {
    return null
  }
}

export function persistMode(mode: ThemeMode, storage?: Storage) {
  try {
    const target = storage ?? window.localStorage
    target.setItem(themeStorageKey, mode)
  } catch {
    // The active theme still works when storage is unavailable.
  }
}

export function resolveThemeMode(storage: Storage | undefined = undefined, media = window.matchMedia(darkModeQuery)): ThemeMode {
  return readStoredMode(storage) ?? (media.matches ? 'dark' : 'light')
}

export function applyThemeMode(mode: ThemeMode, root = document.documentElement) {
  applyThemeTokens(themes[mode], root)
  root.classList.toggle('dark', mode === 'dark')
  root.style.colorScheme = mode
}

export function initializeTheme() {
  const mode = resolveThemeMode()
  applyThemeMode(mode)
  return mode
}
