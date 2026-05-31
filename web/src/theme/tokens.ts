export type ThemeMode = 'light' | 'dark'

export type ThemeTokens = {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  border: string
  input: string
  ring: string
  surfaceLow: string
  surfaceHigh: string
  surfaceBright: string
  glass: string
  outline: string
  radius: string
  shadowCard: string
  shadowDialog: string
  shadowMenu: string
  shadowInput: string
  shadowButtonHover: string
  fontSans: string
  fontMono: string
}

export type ThemeOverrides = Partial<ThemeTokens>

export const themeTokenVariables: Record<keyof ThemeTokens, `--${string}`> = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
  surfaceLow: '--surface-low',
  surfaceHigh: '--surface-high',
  surfaceBright: '--surface-bright',
  glass: '--glass',
  outline: '--outline',
  radius: '--radius',
  shadowCard: '--material-shadow-card',
  shadowDialog: '--material-shadow-dialog',
  shadowMenu: '--material-shadow-menu',
  shadowInput: '--material-shadow-input',
  shadowButtonHover: '--material-shadow-button-hover',
  fontSans: '--material-font-sans',
  fontMono: '--material-font-mono',
}
