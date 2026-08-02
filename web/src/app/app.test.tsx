import '@testing-library/jest-dom/vitest'
import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminShell } from '@/components/layout/admin-shell'
import { App } from '@/app/app'
import { LoginPage } from '@/features/auth/login-page'
import { api } from '@/lib/api'
import { ThemeProvider } from '@/theme'

configure({ testIdAttribute: 'data-testid' })

describe('admin application', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('style')
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: query === '(min-width: 1024px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    vi.spyOn(api, 'me').mockRejectedValue(new Error('unauthorized'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders the login form controls', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    )

    expect(screen.getByLabelText('用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('密码')).toBeInTheDocument()
    expect(screen.getByLabelText('记住登录状态')).not.toBeChecked()
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
    expect(screen.getByTestId('login-empty-region')).toBeInTheDocument()
    expect(screen.getByTestId('login-workflow-showcase')).toBeInTheDocument()
    expect(screen.getByTestId('login-theme-toggle')).toBeInTheDocument()
  })

  it('checks the current session and redirects when it is valid', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({ user: { id: 'user-1', username: 'admin', role: 'admin' } })

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route element={<LoginPage />} path="/login" />
            <Route element={<div data-testid="authenticated-projects-page" />} path="/projects" />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('authenticated-projects-page')).toBeInTheDocument())
  })

  it('uses login as the default route', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </ThemeProvider>,
    )

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('renders the build version and reports backend health', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { ok: true }, error: null }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })))

    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    )

    expect(screen.getByTestId('login-version-tag')).toHaveTextContent(/^ver\. \d{6}-[0-9a-f]{7}$/)
    await waitFor(() => expect(screen.getByTestId('login-health-indicator')).toHaveClass('login-health-indicator-healthy'))
    expect(screen.getByTestId('login-health-indicator')).toHaveAttribute('title', '后端服务运行正常')
  })

  it('renders all workflow showcase stages on desktop', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    )

    expect(screen.getByTestId('login-workflow-stage-requirements')).toBeInTheDocument()
    expect(screen.getByTestId('login-workflow-stage-breakdown')).toBeInTheDocument()
    expect(screen.getByTestId('login-workflow-stage-review')).toBeInTheDocument()
    expect(screen.getByTestId('login-workflow-stage-qa')).toBeInTheDocument()
    expect(screen.queryByTestId('login-workflow-stage-meta-review')).not.toBeInTheDocument()
    expect(screen.queryByTestId('login-workflow-stage-owner-review')).not.toBeInTheDocument()
    expect(screen.queryByTestId('login-workflow-stage-gate-review')).not.toBeInTheDocument()
    expect(screen.queryByTestId('login-workflow-stage-agent-requirements')).not.toBeInTheDocument()
    expect(screen.queryByTestId('login-workflow-stage-human-qa')).not.toBeInTheDocument()
    expect(screen.queryByTestId('login-workflow-task-status-requirements-AK-802')).not.toBeInTheDocument()
    expect(screen.queryByTestId('login-workflow-stage-purpose-requirements')).not.toBeInTheDocument()
    expect(screen.getByTestId('login-workflow-showcase')).not.toHaveTextContent('等待需求负责人确认')
    expect(screen.getAllByTestId(/^login-workflow-background-task-requirements-AK-/)).toHaveLength(4)
    expect(screen.getByTestId('login-workflow-background-task-requirements-AK-795')).toHaveTextContent('权限角色补充说明')
    expect(screen.getByTestId('login-workflow-drop-slot-requirements')).toHaveClass('login-showcase-drop-slot-open')
    expect(screen.queryByTestId('login-workflow-task-detail-requirements-AK-802')).not.toBeInTheDocument()
    expect(screen.getByTestId('login-workflow-showcase')).not.toHaveTextContent(/HANDOFF|进度条/)
  })

  it('keeps the workflow showcase mounted when the login theme changes', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByTestId('login-theme-toggle'))

    expect(document.documentElement).toHaveClass('dark')
    expect(screen.getByTestId('login-workflow-showcase')).toBeInTheDocument()
    expect(screen.getByTestId('login-workflow-grid')).toBeInTheDocument()
  })

  it('does not mount the workflow showcase below the desktop breakpoint', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    )

    expect(screen.queryByTestId('login-workflow-showcase')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
  })

  it('keeps the workflow showcase static when reduced motion is enabled', () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: query === '(min-width: 1024px)' || query === '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    )

    vi.advanceTimersByTime(10_000)

    expect(screen.getByTestId('login-workflow-showcase')).toHaveAttribute('data-reduced-motion', 'true')
    expect(screen.getByTestId('login-workflow-task-requirements-AK-802')).not.toHaveClass('login-showcase-task-executing')
  })

  it('advances from agent execution through human confirmation and transfer', () => {
    vi.useFakeTimers()
    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    )

    const task = screen.getByTestId('login-workflow-task-requirements-AK-802')
    const progress = screen.getByTestId('login-workflow-progress-fill-requirements-AK-802')
    expect(task).toHaveClass('login-showcase-task-executing')
    expect(task).not.toHaveClass('login-showcase-task-compact')
    expect(screen.getByTestId('login-workflow-agent-status-requirements')).toBeInTheDocument()
    expect(screen.getByTestId('login-workflow-substep-requirements')).toHaveTextContent('正在提取目标、边界与验收条件')

    act(() => vi.advanceTimersByTime(1500))
    act(() => vi.advanceTimersByTime(2200))

    expect(task).toHaveClass('login-showcase-task-awaiting')
    expect(screen.getByTestId('login-workflow-human-status-requirements')).toBeInTheDocument()
    expect(screen.getByTestId('login-workflow-substep-requirements')).toHaveTextContent('等待人工确认：确认需求')
    expect(screen.getByTestId('login-workflow-confirm-pointer-requirements')).toHaveClass('lucide-mouse-pointer-2')
    expect(screen.getByTestId('login-workflow-confirm-button-label-requirements')).toHaveTextContent('确认需求')

    act(() => vi.advanceTimersByTime(1400))

    expect(task).toHaveClass('login-showcase-task-confirming')
    expect(screen.getByTestId('login-workflow-confirm-pointer-requirements')).toHaveClass('lucide-pointer')
    expect(screen.getByTestId('login-workflow-confirm-button-label-requirements')).toHaveTextContent('已确认')

    act(() => vi.advanceTimersByTime(800))

    expect(task).toHaveClass('login-showcase-task-moving')
    expect(task).toHaveClass('login-showcase-task-compact')
    expect(screen.getByTestId('login-workflow-task-compact-status-requirements-AK-802')).toHaveTextContent('流转中')
    expect(screen.getByTestId('login-workflow-drop-slot-requirements')).not.toHaveClass('login-showcase-drop-slot-open')
    expect(screen.getByTestId('login-workflow-drop-slot-breakdown')).toHaveClass('login-showcase-drop-slot-compact')
    expect(progress).toHaveClass('login-showcase-progress-paused')
    expect(screen.getByTestId('login-workflow-moving-status-requirements')).toBeInTheDocument()
    expect(screen.getByTestId('login-workflow-substep-requirements')).toHaveTextContent('正在进入下一步')

    act(() => vi.advanceTimersByTime(1400))

    expect(screen.getByTestId('login-workflow-stage-breakdown')).toHaveClass('login-showcase-stage-active')
    expect(screen.getByTestId('login-workflow-task-breakdown-AK-802')).toBe(task)
    expect(task).not.toHaveClass('login-showcase-task-compact')
    expect(screen.getByTestId('login-workflow-drop-slot-breakdown')).toHaveClass('login-showcase-drop-slot-open')
    const nextProgress = screen.getByTestId('login-workflow-progress-fill-breakdown-AK-802')
    expect(nextProgress).not.toBe(progress)
    expect(nextProgress.style.getPropertyValue('--login-showcase-progress-start')).toBe('0.25')
    expect(nextProgress.style.getPropertyValue('--login-showcase-progress-end')).toBe('0.5')
    expect(nextProgress.style.getPropertyValue('--login-showcase-progress-duration')).toBe('3000ms')
    expect(nextProgress).not.toHaveClass('login-showcase-progress-paused')
  })

  it('uses a shuffle transition before restarting the workflow', () => {
    vi.useFakeTimers()
    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    )

    act(() => vi.advanceTimersByTime(1500))

    act(() => vi.advanceTimersByTime(2200))
    act(() => vi.advanceTimersByTime(1400))
    act(() => vi.advanceTimersByTime(800))
    act(() => vi.advanceTimersByTime(1400))

    act(() => vi.advanceTimersByTime(2200))
    act(() => vi.advanceTimersByTime(800))
    act(() => vi.advanceTimersByTime(1400))

    act(() => vi.advanceTimersByTime(2200))
    act(() => vi.advanceTimersByTime(1400))
    act(() => vi.advanceTimersByTime(800))
    act(() => vi.advanceTimersByTime(1400))

    act(() => vi.advanceTimersByTime(2200))
    act(() => vi.advanceTimersByTime(1400))
    act(() => vi.advanceTimersByTime(800))

    expect(screen.getByTestId('login-workflow-carousel')).toHaveClass('login-showcase-carousel-restarting')
    expect(screen.getByTestId('login-workflow-progress-fill-qa-AK-802')).toHaveClass('login-showcase-progress-paused')

    act(() => vi.advanceTimersByTime(1400))

    expect(screen.getByTestId('login-workflow-stage-requirements')).toHaveClass('login-showcase-stage-active')
    expect(screen.getByTestId('login-workflow-carousel')).not.toHaveClass('login-showcase-carousel-restarting')
  })

  it('uses the shuffle animation when the workflow first appears', () => {
    vi.useFakeTimers()
    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    )

    expect(screen.getByTestId('login-workflow-carousel')).toHaveClass('login-showcase-carousel-intro')
    expect(screen.getByTestId('login-workflow-task-requirements-AK-802')).toHaveClass('login-showcase-task-intro')
    expect(screen.getByTestId('login-workflow-task-requirements-AK-802')).not.toHaveClass('login-showcase-task-restart')
    expect(screen.getByTestId('login-workflow-progress-fill-requirements-AK-802')).toHaveClass('login-showcase-progress-paused')

    act(() => vi.advanceTimersByTime(1500))

    expect(screen.getByTestId('login-workflow-carousel')).not.toHaveClass('login-showcase-carousel-intro')
    expect(screen.getByTestId('login-workflow-progress-fill-requirements-AK-802')).not.toHaveClass('login-showcase-progress-paused')
  })

  it('renders the precision progress line while login is pending', () => {
    vi.spyOn(api, 'login').mockImplementation(() => new Promise(() => {}))
    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(screen.getByTestId('login-pending-progress')).toBeInTheDocument()
  })

  it('submits a session login by default', async () => {
    vi.spyOn(api, 'login').mockResolvedValue({})
    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => expect(api.login).toHaveBeenCalledWith('admin', '', false))
  })

  it('submits a persistent login when remember login is checked', async () => {
    vi.spyOn(api, 'login').mockResolvedValue({})
    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByLabelText('记住登录状态'))
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => expect(api.login).toHaveBeenCalledWith('admin', '', true))
  })

  it('renders project navigation in the authenticated shell', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <AdminShell title="任务看板" projectID="project-1">
            <div>看板内容</div>
          </AdminShell>
        </MemoryRouter>
      </ThemeProvider>,
    )

    expect(screen.getByRole('link', { name: '项目列表' })).toHaveAttribute('href', '/projects')
    expect(screen.getByRole('link', { name: 'Agent 密钥' })).toHaveAttribute('href', '/agent-keys')
    expect(screen.getByRole('link', { name: '任务看板' })).toHaveAttribute('href', '/projects/project-1')
    expect(screen.getByRole('link', { name: '仓库与交付物' })).toHaveAttribute('href', '/projects/project-1/repositories')
    expect(screen.getByTestId('admin-theme-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('admin-content')).toBeInTheDocument()
  })

  it('toggles the authenticated shell sidebar from the top bar', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <AdminShell title="任务看板" projectID="project-1">
            <div>看板内容</div>
          </AdminShell>
        </MemoryRouter>
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByTestId('admin-sidebar-toggle'))

    expect(screen.queryByTestId('admin-sidebar')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '展开侧栏' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '展开侧栏' }))

    expect(screen.getByTestId('admin-sidebar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收起侧栏' })).toBeInTheDocument()
  })
})
