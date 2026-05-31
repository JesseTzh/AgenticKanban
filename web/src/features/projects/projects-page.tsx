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
      <div className="mb-6 flex items-center justify-between" data-test-id="projects-heading">
        <div data-test-id="projects-heading-copy">
          <h2 className="text-2xl font-semibold" data-test-id="projects-title">项目概览</h2>
          <p className="text-sm text-muted-foreground" data-test-id="projects-description">选择项目进入任务看板，或创建新的工作空间。</p>
        </div>
        <CreateProjectDialog />
      </div>
      <ErrorAlert error={projects.error} />
      {projects.isPending ? <PageLoading /> : null}
      {!projects.isPending && projects.data?.length === 0 ? <p className="material-panel rounded-lg p-8 text-center text-muted-foreground" data-test-id="projects-empty-state">暂无项目</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-test-id="projects-grid">
        {projects.data?.map((project) => (
          <Link data-test-id={`project-link-${project.ID}`} key={project.ID} to={`/projects/${project.ID}`}>
            <Card className="h-full transition-[background-color,box-shadow] hover:bg-surface-bright hover:shadow-button-hover" data-test-id={`project-card-${project.ID}`}>
              <CardHeader data-test-id={`project-card-header-${project.ID}`}>
                <FolderKanban className="size-5 text-muted-foreground" data-test-id={`project-card-icon-${project.ID}`} />
                <CardTitle data-test-id={`project-card-title-${project.ID}`}>{project.Name}</CardTitle>
                <CardDescription data-test-id={`project-card-description-${project.ID}`}>{project.Description || '默认 AgenticKanban 看板'}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm font-medium" data-test-id={`project-card-action-${project.ID}`}>进入看板<ArrowRight className="size-4" /></CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AdminShell>
  )
}
