import '@testing-library/jest-dom/vitest'
import { configure, fireEvent, render, screen } from '@testing-library/react'
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
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
  })

  afterEach(() => {
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
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
    expect(screen.getByTestId('login-empty-region')).toBeInTheDocument()
    expect(screen.getByTestId('login-theme-toggle')).toBeInTheDocument()
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
    expect(screen.getByRole('link', { name: '任务看板' })).toHaveAttribute('href', '/projects/project-1')
    expect(screen.getByRole('link', { name: '仓库与交付物' })).toHaveAttribute('href', '/projects/project-1/repositories')
    expect(screen.getByTestId('admin-theme-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('admin-content')).toBeInTheDocument()
  })
})
