import { useState, type KeyboardEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ellipsis } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-client'
import type { Task } from '@/types'
import { TaskDetailDialog } from './task-detail-dialog'
import { HumanReviewDialog } from './human-review-dialog'

export function TaskCard({ projectID, task }: { projectID: string; task: Task }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectID) }),
  })
  const canReleaseToAgent = (task.StageKey === 'requirement_clarification' || task.StageKey === 'technical_breakdown') && (task.Status === 'not_ready' || task.Status === 'need_redo')
  const canHumanReview = (task.StageKey === 'technical_breakdown' || task.StageKey === 'code_review') && task.Status === 'pending_human_review'
  const openDetailsFromKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    setDetailsOpen(true)
  }
  return (
    <>
      <Card
        aria-label={`查看任务详情：${task.Title}`}
        className="board-task-card flex cursor-pointer flex-col gap-3 py-3"
        data-testid={`task-card-${task.ID}`}
        onClick={() => setDetailsOpen(true)}
        onKeyDown={openDetailsFromKeyboard}
        role="button"
        tabIndex={0}
      >
        <CardHeader className="px-4 py-0" data-testid={`task-card-header-${task.ID}`}>
          <div data-testid={`task-card-title-row-${task.ID}`}>
            <CardTitle className="text-sm" data-testid={`task-card-title-${task.ID}`}>{task.Title}</CardTitle>
          </div>
        </CardHeader>
        <CardFooter className="justify-between px-4 pb-0" data-testid={`task-card-footer-${task.ID}`}>
          <div className="flex flex-wrap gap-2" data-testid={`task-card-badges-${task.ID}`}><Badge data-testid={`task-status-${task.ID}`} variant="secondary">{task.Status}</Badge>{task.Completed ? <Badge data-testid={`task-completed-${task.ID}`} variant="secondary">已完成</Badge> : null}</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button aria-label="任务操作" data-testid={`task-actions-${task.ID}`} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} size="icon" variant="ghost"><Ellipsis className="size-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-testid={`task-menu-${task.ID}`}>
              <DropdownMenuLabel data-testid={`task-menu-label-${task.ID}`}>任务操作</DropdownMenuLabel>
              {canReleaseToAgent ? <DropdownMenuItem data-testid={`task-agent-ready-${task.ID}`} onSelect={() => mutation.mutate(() => api.markTaskAgentReady(task.ID))}>开放给 Agent</DropdownMenuItem> : null}
              {canHumanReview ? <DropdownMenuItem data-testid={`task-human-review-${task.ID}`} onSelect={() => setReviewOpen(true)}>人工审核</DropdownMenuItem> : null}
              {task.StageKey === 'test_acceptance' && !task.Completed ? <DropdownMenuItem data-testid={`task-test-failed-${task.ID}`} onSelect={() => mutation.mutate(() => api.testRecord(task.ID, { Verdict: 'failed', Note: '测试失败' }))}>测试失败</DropdownMenuItem> : null}
              {task.StageKey === 'test_acceptance' && !task.Completed ? <DropdownMenuItem data-testid={`task-complete-${task.ID}`} onSelect={() => mutation.mutate(() => api.completeTask(task.ID))}>确认验收并归档</DropdownMenuItem> : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>
      <TaskDetailDialog onOpenChange={setDetailsOpen} open={detailsOpen} projectID={projectID} task={task} />
      <HumanReviewDialog onOpenChange={setReviewOpen} open={reviewOpen} projectID={projectID} taskID={task.ID} />
    </>
  )
}
