import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ellipsis, LockKeyhole } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-client'
import type { Task } from '@/types'

export function TaskCard({ projectID, task }: { projectID: string; task: Task }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectID) }),
  })
  const move = (StageKey: string) => mutation.mutate(() => api.transitionTask(task.ID, { StageKey, Status: 'agentic_ready', Reason: '前端操作' }))
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">{task.Title}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button aria-label="任务操作" size="icon" variant="ghost"><Ellipsis className="size-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>流转任务</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => move('technical_breakdown')}>到技术拆解</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => move('development_execution')}>到开发执行</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => move('code_review')}>到代码复核</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => mutation.mutate(() => api.review(task.ID, { Verdict: 'approved', Note: '通过' }))}>复核通过</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => mutation.mutate(() => api.testRecord(task.ID, { Verdict: 'failed', Note: '测试失败' }))}>测试失败</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => mutation.mutate(() => api.testRecord(task.ID, { Verdict: 'passed', Note: '通过' }))}>测试通过</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => mutation.mutate(() => api.createArchive(task.ID, `# ${task.Title}\n\n完成归档。`))}>生成归档</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        <div className="flex flex-wrap gap-2"><Badge variant="secondary">{task.Status}</Badge>{task.Locked ? <Badge variant="outline"><LockKeyhole className="size-3" />已锁定</Badge> : null}</div>
        {task.Description ? <p className="text-xs text-muted-foreground">{task.Description}</p> : null}
      </CardContent>
    </Card>
  )
}
