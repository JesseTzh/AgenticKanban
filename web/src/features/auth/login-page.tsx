import { useState } from 'react'
import { LockKeyhole, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { isDemoMode } from '@/lib/runtime'
import { demoProjects } from '@/lib/demo-data'
import { ThemeToggle } from '@/theme'
import { LoginWorkflowShowcase } from './login-workflow-showcase'

export function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState(isDemoMode ? 'demo' : 'admin')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function login() {
    setPending(true)
    setError('')
    try {
      await api.login(username, password, remember)
      navigate(isDemoMode ? `/projects/${demoProjects[0].ID}` : '/')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '登录失败')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,3fr)_minmax(28rem,2fr)]" data-testid="login-page">
      <div className="hidden lg:block" data-testid="login-empty-region">
        <LoginWorkflowShowcase />
      </div>
      <section className="relative flex min-h-screen items-center justify-center bg-surface-low/90 p-8 backdrop-blur-[20px] lg:px-12 xl:px-16" data-testid="login-form-region">
        <div className="absolute right-6 top-6" data-testid="login-theme-actions">
          <ThemeToggle dataTestId="login-theme-toggle" />
        </div>
        <div className="w-full max-w-md" data-testid="login-panel-content">
          <header className="mb-12" data-testid="login-header">
            <div className="mb-3 flex items-center gap-2" data-testid="login-eyebrow">
              <span className="h-1 w-8 bg-primary" data-testid="login-eyebrow-bar" />
              <span className="text-[10px] font-black tracking-[0.3em] text-primary uppercase" data-testid="login-eyebrow-text">AGENTIC DELIVERY CONTROL</span>
            </div>
            <h1 className="text-3xl font-bold tracking-[-0.04em] text-foreground" data-testid="login-title">Agentic Kanban</h1>
            <p className="mt-2 text-sm text-muted-foreground" data-testid="login-description">{isDemoMode ? '演示模式：任意用户名和密码均可进入系统。' : '登录后管理 Agentic Coding 工作流'}</p>
          </header>
          <form
            className="space-y-6"
            data-testid="login-form"
            onSubmit={(event) => {
              event.preventDefault()
              void login()
            }}
          >
            <div className="space-y-2" data-testid="login-username-field">
              <Label className="ml-1 text-[10px] font-bold tracking-widest" data-testid="login-username-label" htmlFor="username">用户名</Label>
              <div className="group relative" data-testid="login-username-input-shell">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" data-testid="login-username-icon" />
                <Input className="h-12 pl-12" data-testid="login-username" id="username" onChange={(event) => setUsername(event.target.value)} value={username} />
              </div>
            </div>
            <div className="space-y-2" data-testid="login-password-field">
              <Label className="ml-1 text-[10px] font-bold tracking-widest" data-testid="login-password-label" htmlFor="password">密码</Label>
              <div className="group relative" data-testid="login-password-input-shell">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" data-testid="login-password-icon" />
                <Input
                  className="h-12 pl-12"
                  id="password"
                  data-testid="login-password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 py-1" data-testid="login-remember-field">
              <input
                checked={remember}
                className="size-4 rounded border-outline bg-surface-high text-primary focus:ring-ring"
                data-testid="login-remember"
                id="remember"
                onChange={(event) => setRemember(event.target.checked)}
                type="checkbox"
              />
              <Label className="text-xs font-medium text-muted-foreground" data-testid="login-remember-label" htmlFor="remember">记住登录状态</Label>
            </div>
            {error ? (
              <Alert data-testid="login-error" variant="destructive">
                <AlertDescription data-testid="login-error-description">{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button className="h-12 w-full text-sm font-bold tracking-wide" data-testid="login-submit" disabled={pending} type="submit">
              {pending ? '登录中...' : '登录'}
            </Button>
            {pending ? <div className="precision-progress" data-testid="login-pending-progress" /> : null}
          </form>
        </div>
      </section>
    </main>
  )
}
