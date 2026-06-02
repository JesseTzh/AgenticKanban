import '@testing-library/jest-dom/vitest'
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import type { Task } from '@/types'
import { TaskDetailDialog } from './task-detail-dialog'
import { HumanReviewDialog } from './human-review-dialog'

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
  Completed: false,
  AgentID: '',
}

describe('TaskDetailDialog', () => {
  afterEach(() => vi.restoreAllMocks())

  it('adds a same-project task reference', async () => {
    const referencedTask = { ...task, ID: 'task-2', Title: 'Referenced task' }
    vi.spyOn(api, 'tasks').mockResolvedValue([task, referencedTask])
    vi.spyOn(api, 'taskRefs').mockResolvedValue([])
    vi.spyOn(api, 'agentWork').mockResolvedValue({ Runs: [], HumanReviews: [] })
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

  it('renders agent work without lock state', async () => {
    vi.spyOn(api, 'tasks').mockResolvedValue([task])
    vi.spyOn(api, 'taskRefs').mockResolvedValue([])
    vi.spyOn(api, 'agentWork').mockResolvedValue({
      Runs: [{ ID: 'run-1', TaskID: 'task-1', AgentID: 'agent-1', AgentKeyName: 'codex', AgentOwnerUsername: 'developer', WorkType: 'code_review', Status: 'submitted', Result: 'looks good', Passed: true, CreatedAt: '2026-06-01' }],
      HumanReviews: [{ ID: 'review-1', TaskID: 'task-1', AgentRunID: 'run-1', Decision: 'approved', Note: 'confirmed', ReviewerID: 'admin', CreatedAt: '2026-06-01' }],
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(<QueryClientProvider client={queryClient}><TaskDetailDialog onOpenChange={vi.fn()} open projectID="project-1" task={task} /></QueryClientProvider>)

    expect(await screen.findByText('looks good')).toBeInTheDocument()
    expect(screen.getByText('developer / codex')).toBeInTheDocument()
    expect(screen.getByText('confirmed')).toBeInTheDocument()
    expect(screen.queryByText('锁定状态')).not.toBeInTheDocument()
  })

  it('submits a required human review note', async () => {
    vi.spyOn(api, 'approveTask').mockResolvedValue({})
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })

    render(<QueryClientProvider client={queryClient}><HumanReviewDialog onOpenChange={vi.fn()} open projectID="project-1" taskID="task-1" /></QueryClientProvider>)

    expect(screen.getByTestId('human-review-approve-task-1')).toBeDisabled()
    fireEvent.change(screen.getByTestId('human-review-note-task-1'), { target: { value: 'clear result' } })
    fireEvent.click(screen.getByTestId('human-review-approve-task-1'))
    await waitFor(() => expect(api.approveTask).toHaveBeenCalledWith('task-1', { Decision: 'approved', Note: 'clear result' }))
  })
})
