import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, FolderKanban } from 'lucide-react'
import { AdminShell } from '@/components/layout/admin-shell'
import { ErrorAlert } from '@/components/layout/error-alert'
import { PageLoading } from '@/components/layout/page-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-client'
import { CreateProjectDialog } from './create-project-dialog'

export function ProjectsPage() {
  const projects = useQuery({ queryKey: queryKeys.projects, queryFn: api.projects })
  return (
    <AdminShell title="项目列表">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">项目概览</h2>
          <p className="text-sm text-muted-foreground">选择项目进入任务看板，或创建新的工作空间。</p>
        </div>
        <CreateProjectDialog />
      </div>
      <ErrorAlert error={projects.error} />
      {projects.isPending ? <PageLoading /> : null}
      {!projects.isPending && projects.data?.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">暂无项目</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.data?.map((project) => (
          <Link key={project.ID} to={`/projects/${project.ID}`}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <FolderKanban className="size-5 text-muted-foreground" />
                <CardTitle>{project.Name}</CardTitle>
                <CardDescription>{project.Description || '默认 AgenticKanban 看板'}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm font-medium">进入看板<ArrowRight className="size-4" /></CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AdminShell>
  )
}
