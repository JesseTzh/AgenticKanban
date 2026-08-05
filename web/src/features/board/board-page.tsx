import { useQuery } from '@tanstack/react-query'
import { Inbox, Workflow } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { AdminShell } from '@/components/layout/admin-shell'
import { ErrorAlert } from '@/components/layout/error-alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-client'
import { STAGES } from '@/workflow'
import { CreateTaskDialog } from './create-task-dialog'
import { TaskCard } from './task-card'

export function BoardPage() {
  const { projectID = '' } = useParams()
  const stages = useQuery({ queryKey: queryKeys.board(projectID), queryFn: () => api.board(projectID) })
  const tasks = useQuery({ queryKey: queryKeys.tasks(projectID), queryFn: () => api.tasks(projectID) })
  const columns = stages.data?.length ? stages.data : STAGES.map(([Key, Name], Position) => ({ Key, Name, Position }))
  const taskCount = tasks.data?.length ?? 0

  return (
    <AdminShell projectID={projectID} title="任务看板">
      <section className="board-page" data-testid="board-page">
        <header className="board-heading" data-testid="board-heading">
          <div data-testid="board-heading-copy">
            <div className="flex items-center gap-3" data-testid="board-title-row">
              <span className="board-title-mark" data-testid="board-title-mark"><Workflow data-testid="board-title-icon" /></span>
              <div data-testid="board-title-copy">
                <p className="board-eyebrow" data-testid="board-eyebrow">WORKFLOW CONTROL</p>
                <h1 className="board-title" data-testid="board-title">任务看板</h1>
              </div>
            </div>
          </div>
          <div className="board-summary" data-testid="board-summary">
            <span data-testid="board-summary-label">当前任务</span>
            <strong data-testid="board-summary-count">{String(taskCount).padStart(2, '0')}</strong>
          </div>
        </header>
        <ErrorAlert error={stages.error || tasks.error} />
        {tasks.isPending ? <Skeleton className="h-96 rounded-lg" data-testid="board-loading" /> : null}
        {!tasks.isPending ? (
          <div className="board-columns" data-testid="board-columns">
            <div className="board-columns-grid" data-testid="board-columns-grid">
              {columns.map((stage, index) => {
                const stageTasks = tasks.data?.filter((task) => task.StageKey === stage.Key) ?? []
                return (
                  <section
                    className="board-column"
                    data-testid={`board-column-${stage.Key}`}
                    key={stage.Key}
                  >
                    <header className="board-column-header" data-testid={`board-column-header-${stage.Key}`}>
                      <div className="flex min-w-0 items-center gap-3" data-testid={`board-column-title-group-${stage.Key}`}>
                        <span className="board-column-index" data-testid={`board-column-index-${stage.Key}`}>{String(index + 1).padStart(2, '0')}</span>
                        <h2 className="truncate text-sm font-semibold" data-testid={`board-column-title-${stage.Key}`}>{stage.Name}</h2>
                      </div>
                      <Badge className="board-column-count" data-testid={`board-column-count-${stage.Key}`} variant="secondary">
                        {stageTasks.length}
                      </Badge>
                    </header>
                    <div className="board-column-tasks" data-testid={`board-column-tasks-${stage.Key}`}>
                      {stageTasks.map((task) => <TaskCard key={task.ID} projectID={projectID} task={task} />)}
                      {stageTasks.length === 0 ? (
                        <div
                          className="board-column-empty"
                          data-testid={`board-column-empty-${stage.Key}`}
                        >
                          <span className="board-empty-icon" data-testid={`board-column-empty-icon-shell-${stage.Key}`}>
                            <Inbox data-testid={`board-column-empty-icon-${stage.Key}`} />
                          </span>
                          <p className="text-xs font-medium text-muted-foreground" data-testid={`board-column-empty-title-${stage.Key}`}>暂无任务</p>
                          <p className="mt-1 text-[10px] leading-4 text-muted-foreground/70" data-testid={`board-column-empty-description-${stage.Key}`}>任务进入此阶段后将在这里显示</p>
                        </div>
                      ) : null}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        ) : null}
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2" data-testid="board-create-task-floating">
          <CreateTaskDialog projectID={projectID} />
        </div>
      </section>
    </AdminShell>
  )
}
