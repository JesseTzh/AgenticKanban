import '@testing-library/jest-dom/vitest'
import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminShell } from '@/components/layout/admin-shell'
import { LoginPage } from '@/features/auth/login-page'
import { api } from '@/lib/api'
import { ThemeProvider } from '@/theme'

configure({ testIdAttribute: 'data-test-id' })

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
    expect(screen.getByTestId('login-workflow-task-requirements-AK-802')).not.toHaveClass('login-showcase-task-scanning')
  })

  it('advances the active showcase task through scan, verify, and transfer phases', () => {
    vi.useFakeTimers()
    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    )

    const task = screen.getByTestId('login-workflow-task-requirements-AK-802')
    act(() => vi.advanceTimersByTime(1200))
    expect(task).toHaveClass('login-showcase-task-scanning')
    act(() => vi.advanceTimersByTime(2000))
    expect(task).toHaveClass('login-showcase-task-verifying')
    act(() => vi.advanceTimersByTime(1000))
    expect(task).toHaveClass('login-showcase-task-moving')
    act(() => vi.advanceTimersByTime(1500))
    expect(screen.getByTestId('login-workflow-stage-breakdown')).toHaveClass('login-showcase-stage-active')
    expect(screen.getByTestId('login-workflow-task-breakdown-AK-802')).toBeInTheDocument()
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

    expect(screen.getByRole('link', { name: '项目列表' })).toHaveAttribute('href', '/')
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
