import { useState, type KeyboardEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ellipsis, LockKeyhole } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-client'
import type { Task } from '@/types'
import { TaskDetailDialog } from './task-detail-dialog'

export function TaskCard({ projectID, task }: { projectID: string; task: Task }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectID) }),
  })
  const move = (StageKey: string) => mutation.mutate(() => api.transitionTask(task.ID, { StageKey, Status: 'agentic_ready', Reason: '前端操作' }))
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
          <div className="flex flex-wrap gap-2" data-test-id={`task-card-badges-${task.ID}`}><Badge data-test-id={`task-status-${task.ID}`} variant="secondary">{task.Status}</Badge>{task.Completed ? <Badge data-test-id={`task-completed-${task.ID}`} variant="secondary">已完成</Badge> : null}{task.Locked ? <Badge data-test-id={`task-lock-${task.ID}`} variant="outline"><LockKeyhole className="size-3" />已锁定</Badge> : null}</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button aria-label="任务操作" data-test-id={`task-actions-${task.ID}`} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} size="icon" variant="ghost"><Ellipsis className="size-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-test-id={`task-menu-${task.ID}`}>
              <DropdownMenuLabel data-test-id={`task-menu-label-${task.ID}`}>流转任务</DropdownMenuLabel>
              <DropdownMenuItem data-test-id={`task-move-technical-breakdown-${task.ID}`} onSelect={() => move('technical_breakdown')}>到技术拆解</DropdownMenuItem>
              <DropdownMenuItem data-test-id={`task-move-code-review-${task.ID}`} onSelect={() => move('code_review')}>到代码审核</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-test-id={`task-review-approved-${task.ID}`} onSelect={() => mutation.mutate(() => api.review(task.ID, { Verdict: 'approved', Note: '通过' }))}>审核通过</DropdownMenuItem>
              <DropdownMenuItem data-test-id={`task-test-failed-${task.ID}`} onSelect={() => mutation.mutate(() => api.testRecord(task.ID, { Verdict: 'failed', Note: '测试失败' }))}>测试失败</DropdownMenuItem>
              {task.StageKey === 'test_acceptance' && !task.Completed ? <DropdownMenuItem data-test-id={`task-complete-${task.ID}`} onSelect={() => mutation.mutate(() => api.completeTask(task.ID))}>确认完成</DropdownMenuItem> : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>
      <TaskDetailDialog onOpenChange={setDetailsOpen} open={detailsOpen} projectID={projectID} task={task} />
    </>
  )
}
