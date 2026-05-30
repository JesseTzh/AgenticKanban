import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { AdminShell } from '@/components/layout/admin-shell'
import { ErrorAlert } from '@/components/layout/error-alert'
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
  return (
    <AdminShell projectID={projectID} title="任务看板">
      <div className="mb-6 flex items-center justify-between">
        <div><h2 className="text-2xl font-semibold">任务工作流</h2><p className="text-sm text-muted-foreground">沿六个阶段推进任务并记录复核、测试和归档结果。</p></div>
        <CreateTaskDialog projectID={projectID} />
      </div>
      <ErrorAlert error={stages.error || tasks.error} />
      {tasks.isPending ? <Skeleton className="h-80 rounded-xl" /> : null}
      <div className="grid min-w-max grid-cols-6 gap-4 overflow-x-auto pb-4">
        {columns.map((stage) => (
          <section className="w-72 rounded-xl border bg-muted/40 p-3" key={stage.Key}>
            <h3 className="mb-3 text-sm font-semibold">{stage.Name}</h3>
            <div className="space-y-3">{tasks.data?.filter((task) => task.StageKey === stage.Key).map((task) => <TaskCard key={task.ID} projectID={projectID} task={task} />)}</div>
          </section>
        ))}
      </div>
    </AdminShell>
  )
}
