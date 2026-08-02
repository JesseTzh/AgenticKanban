import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

function gitValue(args: string[]) {
  try {
    return execFileSync('git', args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function formatDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${String(date.getFullYear()).slice(-2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

function resolveAppVersion(env: Record<string, string>) {
  const configured = env.VITE_APP_VERSION?.trim()
  if (configured) return configured

  const date = gitValue(['show', '-s', '--format=%cd', '--date=format:%y%m%d', 'HEAD']) || formatDate(new Date())
  const sha = gitValue(['rev-parse', '--short=7', 'HEAD']) || 'unknown'
  return `${date}-${sha}`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appVersion = resolveAppVersion(env)
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react(), tailwindcss()],
    define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion) },
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    server: { proxy: { '/api': 'http://localhost:8080' } },
    test: { environment: 'jsdom', globals: true },
  }
})
