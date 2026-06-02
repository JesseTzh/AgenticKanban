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
        className="flex cursor-pointer flex-col gap-2 py-3 transition-[background-color,box-shadow] hover:bg-surface-bright hover:shadow-button-hover"
        data-test-id={`task-card-${task.ID}`}
        onClick={() => setDetailsOpen(true)}
        onKeyDown={openDetailsFromKeyboard}
        role="button"
        tabIndex={0}
      >
        <CardHeader className="px-4 py-0" data-test-id={`task-card-header-${task.ID}`}>
          <div data-test-id={`task-card-title-row-${task.ID}`}>
            <CardTitle className="text-sm" data-test-id={`task-card-title-${task.ID}`}>{task.Title}</CardTitle>
          </div>
        </CardHeader>
        <CardFooter className="justify-between px-4 pb-0" data-test-id={`task-card-footer-${task.ID}`}>
          <div className="flex flex-wrap gap-2" data-test-id={`task-card-badges-${task.ID}`}><Badge data-test-id={`task-status-${task.ID}`} variant="secondary">{task.Status}</Badge>{task.Completed ? <Badge data-test-id={`task-completed-${task.ID}`} variant="secondary">已完成</Badge> : null}</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button aria-label="任务操作" data-test-id={`task-actions-${task.ID}`} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} size="icon" variant="ghost"><Ellipsis className="size-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-test-id={`task-menu-${task.ID}`}>
              <DropdownMenuLabel data-test-id={`task-menu-label-${task.ID}`}>任务操作</DropdownMenuLabel>
              {canReleaseToAgent ? <DropdownMenuItem data-test-id={`task-agent-ready-${task.ID}`} onSelect={() => mutation.mutate(() => api.markTaskAgentReady(task.ID))}>开放给 Agent</DropdownMenuItem> : null}
              {canHumanReview ? <DropdownMenuItem data-test-id={`task-human-review-${task.ID}`} onSelect={() => setReviewOpen(true)}>人工审核</DropdownMenuItem> : null}
              {task.StageKey === 'test_acceptance' && !task.Completed ? <DropdownMenuItem data-test-id={`task-test-failed-${task.ID}`} onSelect={() => mutation.mutate(() => api.testRecord(task.ID, { Verdict: 'failed', Note: '测试失败' }))}>测试失败</DropdownMenuItem> : null}
              {task.StageKey === 'test_acceptance' && !task.Completed ? <DropdownMenuItem data-test-id={`task-complete-${task.ID}`} onSelect={() => mutation.mutate(() => api.completeTask(task.ID))}>确认完成</DropdownMenuItem> : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>
      <TaskDetailDialog onOpenChange={setDetailsOpen} open={detailsOpen} projectID={projectID} task={task} />
      <HumanReviewDialog onOpenChange={setReviewOpen} open={reviewOpen} projectID={projectID} taskID={task.ID} />
    </>
  )
}
