import '@testing-library/jest-dom/vitest'
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import type { Task } from '@/types'
import { TaskCard } from './task-card'

configure({ testIdAttribute: 'data-test-id' })

const task: Task = {
  ID: 'task-1',
  ProjectID: 'project-1',
  ParentID: '',
  Title: 'Current task',
  Description: '',
  StageKey: 'requirement_clarification',
  Status: 'not_ready',
  AgentReady: false,
  Completed: false,
  AgentID: '',
}

describe('TaskCard', () => {
  afterEach(() => vi.restoreAllMocks())

  it('exposes the explicit release-to-agent action', async () => {
    vi.spyOn(api, 'markTaskAgentReady').mockResolvedValue({})
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    render(<QueryClientProvider client={queryClient}><TaskCard projectID="project-1" task={task} /></QueryClientProvider>)

    fireEvent.pointerDown(screen.getByTestId('task-actions-task-1'), { button: 0, ctrlKey: false })
    fireEvent.click(await screen.findByTestId('task-agent-ready-task-1'))

    await waitFor(() => expect(api.markTaskAgentReady).toHaveBeenCalledWith('task-1'))
    expect(screen.queryByText('已锁定')).not.toBeInTheDocument()
  })
})
