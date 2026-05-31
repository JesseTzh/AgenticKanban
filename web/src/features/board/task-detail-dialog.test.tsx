import '@testing-library/jest-dom/vitest'
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import type { Task } from '@/types'
import { TaskDetailDialog } from './task-detail-dialog'

configure({ testIdAttribute: 'data-test-id' })

const task: Task = {
  ID: 'task-1',
  ProjectID: 'project-1',
  ParentID: '',
  Title: 'Current task',
  Description: '',
  StageKey: 'test_acceptance',
  Status: 'agentic_ready',
  AgentReady: true,
  Locked: false,
  Completed: false,
  AgentID: '',
}

describe('TaskDetailDialog', () => {
  afterEach(() => vi.restoreAllMocks())

  it('adds a same-project task reference', async () => {
    const referencedTask = { ...task, ID: 'task-2', Title: 'Referenced task' }
    vi.spyOn(api, 'tasks').mockResolvedValue([task, referencedTask])
    vi.spyOn(api, 'taskRefs').mockResolvedValue([])
    vi.spyOn(api, 'addTaskRef').mockResolvedValue({})
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <TaskDetailDialog onOpenChange={vi.fn()} open projectID="project-1" task={task} />
      </QueryClientProvider>,
    )

    await screen.findByTestId('task-detail-ref-option-task-1-task-2')
    fireEvent.change(screen.getByTestId('task-detail-ref-select-task-1'), { target: { value: 'task-2' } })
    fireEvent.click(screen.getByTestId('task-detail-ref-add-task-1'))

    await waitFor(() => expect(api.addTaskRef).toHaveBeenCalledWith('task-1', 'task-2'))
  })
})
