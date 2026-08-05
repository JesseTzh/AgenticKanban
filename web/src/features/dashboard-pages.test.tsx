import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { configure, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { ThemeProvider } from '@/theme'
import { BoardPage } from '@/features/board/board-page'
import { ProjectsPage } from '@/features/projects/projects-page'

configure({ testIdAttribute: 'data-testid' })

function renderPage(element: ReactNode, initialEntry = '/projects') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>{element}</MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

describe('authenticated dashboard pages', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
  })

  afterEach(() => vi.restoreAllMocks())

  it('shows a createable placeholder when there are no projects', async () => {
    vi.spyOn(api, 'projects').mockResolvedValue([])

    renderPage(<ProjectsPage />)

    expect(await screen.findByTestId('projects-empty-state')).toBeInTheDocument()
    expect(screen.getByTestId('create-project-open')).toHaveTextContent('新增项目')
    expect(screen.queryByTestId('admin-sidebar')).not.toBeInTheDocument()
  })

  it('keeps every workflow stage visible with an empty task panel', async () => {
    vi.spyOn(api, 'board').mockResolvedValue([])
    vi.spyOn(api, 'tasks').mockResolvedValue([])

    renderPage(
      <Routes>
        <Route element={<BoardPage />} path="/projects/:projectID" />
      </Routes>,
      '/projects/project-1',
    )

    expect(await screen.findByTestId('board-column-requirement_clarification')).toBeInTheDocument()
    expect(screen.getAllByText('暂无任务')).toHaveLength(6)
    expect(screen.getByTestId('board-column-empty-technical_breakdown')).toBeInTheDocument()
    expect(screen.getByTestId('board-column-empty-code_implementation')).toBeInTheDocument()
    expect(screen.getByTestId('board-column-empty-code_review')).toBeInTheDocument()
    expect(screen.getByTestId('board-column-empty-test_acceptance')).toBeInTheDocument()
    expect(screen.getByTestId('board-column-empty-archive')).toBeInTheDocument()
    expect(screen.getByTestId('board-title')).toHaveTextContent('任务看板')
    expect(screen.getByTestId('board-summary-count')).toHaveTextContent('00')
    expect(screen.getByTestId('board-column-requirement_clarification')).toHaveClass('board-column')
    expect(screen.getByTestId('board-create-task-floating')).toContainElement(screen.getByTestId('create-task-open'))
    expect(screen.queryByText('任务工作流')).not.toBeInTheDocument()
    expect(screen.queryByText('沿四个阶段推进任务，并持续记录 Agent 与人工协作结果。')).not.toBeInTheDocument()
    expect(screen.queryByTestId('board-delivery-link')).not.toBeInTheDocument()
  })
})
