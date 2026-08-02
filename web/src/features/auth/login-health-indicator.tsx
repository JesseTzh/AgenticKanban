import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { isDemoMode } from '@/lib/runtime'

type HealthStatus = 'checking' | 'healthy' | 'unhealthy' | 'disabled'

const healthCopy: Record<HealthStatus, { label: string; title: string }> = {
  checking: { label: 'BACKEND CHECKING', title: '正在检测后端服务健康状况' },
  healthy: { label: 'BACKEND ONLINE', title: '后端服务运行正常' },
  unhealthy: { label: 'BACKEND OFFLINE', title: '后端服务无法访问' },
  disabled: { label: 'DEMO / DISABLED', title: 'demo 模式无法进行健康检测' },
}

export function LoginHealthIndicator() {
  const [status, setStatus] = useState<HealthStatus>(isDemoMode ? 'disabled' : 'checking')

  useEffect(() => {
    if (isDemoMode) return

    let disposed = false
    const checkHealth = async () => {
      try {
        const result = await api.health()
        if (!disposed) setStatus(result.ok ? 'healthy' : 'unhealthy')
      } catch {
        if (!disposed) setStatus('unhealthy')
      }
    }

    void checkHealth()
    const interval = window.setInterval(() => void checkHealth(), 30_000)
    return () => {
      disposed = true
      window.clearInterval(interval)
    }
  }, [])

  const copy = healthCopy[status]
  return (
    <div
      aria-label={copy.title}
      aria-live="polite"
      className={cn('login-health-indicator', `login-health-indicator-${status}`)}
      data-testid="login-health-indicator"
      title={copy.title}
    >
      <span aria-hidden="true" className="login-health-light" data-testid="login-health-light" />
      <span data-testid="login-health-label">{copy.label}</span>
    </div>
  )
}
