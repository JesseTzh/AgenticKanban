import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AdminShell } from '@/components/layout/admin-shell'
import { LoginPage } from '@/features/auth/login-page'

describe('admin application', () => {
  it('renders the login form controls', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('密码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
  })

  it('renders project navigation in the authenticated shell', () => {
    render(
      <MemoryRouter>
        <AdminShell title="任务看板" projectID="project-1">
          <div>看板内容</div>
        </AdminShell>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: '项目列表' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: '任务看板' })).toHaveAttribute('href', '/projects/project-1')
    expect(screen.getByRole('link', { name: '仓库与交付物' })).toHaveAttribute('href', '/projects/project-1/repositories')
  })
})
