import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { ThemeToggle } from '@/theme'

export function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function login() {
    setPending(true)
    setError('')
    try {
      await api.login(username, password)
      navigate('/')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '登录失败')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1.15fr)_minmax(28rem,0.85fr)]" data-test-id="login-page">
      <section className="hidden lg:block" data-test-id="login-empty-region" />
      <section className="relative flex min-h-screen items-center justify-center bg-surface-low p-6 lg:justify-start lg:px-16" data-test-id="login-form-region">
        <div className="absolute right-6 top-6" data-test-id="login-theme-actions">
          <ThemeToggle dataTestId="login-theme-toggle" />
        </div>
        <Card className="w-full max-w-sm" data-test-id="login-card">
          <CardHeader data-test-id="login-card-header">
            <CardTitle className="text-xl tracking-[-0.02em]" data-test-id="login-title">AgenticKanban</CardTitle>
            <CardDescription data-test-id="login-description">登录后管理 Agentic Coding 工作流</CardDescription>
          </CardHeader>
          <CardContent data-test-id="login-card-content">
          <form
            className="space-y-4"
            data-test-id="login-form"
            onSubmit={(event) => {
              event.preventDefault()
              void login()
            }}
          >
            <div className="space-y-2" data-test-id="login-username-field">
              <Label data-test-id="login-username-label" htmlFor="username">用户名</Label>
              <Input data-test-id="login-username" id="username" onChange={(event) => setUsername(event.target.value)} value={username} />
            </div>
            <div className="space-y-2" data-test-id="login-password-field">
              <Label data-test-id="login-password-label" htmlFor="password">密码</Label>
              <Input
                id="password"
                data-test-id="login-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </div>
            {error ? (
              <Alert data-test-id="login-error" variant="destructive">
                <AlertDescription data-test-id="login-error-description">{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button className="w-full" data-test-id="login-submit" disabled={pending} type="submit">
              {pending ? '登录中...' : '登录'}
            </Button>
            {pending ? <div className="precision-progress" data-test-id="login-pending-progress" /> : null}
          </form>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
