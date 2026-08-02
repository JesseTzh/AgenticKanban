const configuredBasePath = import.meta.env.VITE_BASE_PATH || import.meta.env.BASE_URL || '/'

export const basePath = configuredBasePath.endsWith('/') ? configuredBasePath.slice(0, -1) : configuredBasePath
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'
export const appVersion = import.meta.env.VITE_APP_VERSION || '000000-unknown'

export function appPath(path: string): string {
  return `${basePath}${path}` || '/'
}
