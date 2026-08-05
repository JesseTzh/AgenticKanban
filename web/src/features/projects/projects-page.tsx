import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowUpRight, FolderKanban, Plus } from 'lucide-react'
import { AdminShell } from '@/components/layout/admin-shell'
import { ErrorAlert } from '@/components/layout/error-alert'
import { PageLoading } from '@/components/layout/page-loading'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-client'
import { CreateProjectDialog } from './create-project-dialog'

export function ProjectsPage() {
  const projects = useQuery({ queryKey: queryKeys.projects, queryFn: api.projects })
  const hasProjects = Boolean(projects.data?.length)

  return (
    <AdminShell title="项目列表">
      <section data-testid="projects-page">
        <div className="mb-10 flex items-end justify-between gap-6" data-testid="projects-heading">
          <div data-testid="projects-heading-copy">
            <div className="mb-3 flex items-center gap-3" data-testid="projects-eyebrow">
              <span className="h-px w-10 bg-primary" data-testid="projects-eyebrow-line" />
              <span className="text-[10px] font-bold tracking-[0.24em] text-primary uppercase" data-testid="projects-eyebrow-text">
                Workspace Index
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-5xl" data-testid="projects-title">选择工作空间</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground md:text-base" data-testid="projects-description">
              每个项目拥有独立的 Agentic 工作流、任务看板与交付记录。
            </p>
          </div>
          {hasProjects ? <CreateProjectDialog className="shrink-0" /> : null}
        </div>
        <ErrorAlert error={projects.error} />
        {projects.isPending ? <PageLoading /> : null}
        {!projects.isPending ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-testid="projects-grid">
            {projects.data?.map((project, index) => (
              <Link data-testid={`project-link-${project.ID}`} key={project.ID} to={`/projects/${project.ID}`}>
                <Card
                  className="group flex min-h-72 h-full flex-col overflow-hidden transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-1 hover:bg-surface-bright hover:shadow-button-hover"
                  data-testid={`project-card-${project.ID}`}
                >
                  <CardHeader className="flex-1" data-testid={`project-card-header-${project.ID}`}>
                    <div className="mb-8 flex items-start justify-between" data-testid={`project-card-meta-${project.ID}`}>
                      <span className="font-mono text-xs text-muted-foreground" data-testid={`project-card-index-${project.ID}`}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span
                        className="grid size-11 place-items-center rounded-lg bg-secondary text-secondary-foreground transition-transform duration-300 group-hover:rotate-3"
                        data-testid={`project-card-icon-shell-${project.ID}`}
                      >
                        <FolderKanban className="size-5" data-testid={`project-card-icon-${project.ID}`} />
                      </span>
                    </div>
                    <CardTitle className="text-xl tracking-[-0.03em]" data-testid={`project-card-title-${project.ID}`}>{project.Name}</CardTitle>
                    <CardDescription className="mt-2 leading-6" data-testid={`project-card-description-${project.ID}`}>
                      {project.Description || '默认 Agentic Kanban 工作空间'}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="justify-between border-t border-outline pt-5" data-testid={`project-card-footer-${project.ID}`}>
                    <Badge data-testid={`project-card-status-${project.ID}`} variant="outline">ACTIVE</Badge>
                    <span className="flex items-center gap-2 text-sm font-medium text-primary" data-testid={`project-card-action-${project.ID}`}>
                      进入看板
                      <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" data-testid={`project-card-action-icon-${project.ID}`} />
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
            {!hasProjects ? (
              <Card
                className="grid min-h-72 place-items-center border border-dashed border-primary/35 bg-card/35 shadow-none"
                data-testid="projects-empty-state"
              >
                <CardContent className="flex flex-col items-center px-8 py-10 text-center" data-testid="projects-empty-content">
                  <span className="mb-5 grid size-14 place-items-center rounded-full border border-dashed border-primary/50 text-primary" data-testid="projects-empty-icon-shell">
                    <Plus className="size-6" data-testid="projects-empty-icon" />
                  </span>
                  <CardTitle className="text-lg" data-testid="projects-empty-title">这里将出现你的第一个项目</CardTitle>
                  <CardDescription className="mb-6 mt-2 max-w-xs leading-6" data-testid="projects-empty-description">
                    创建工作空间后，系统会自动准备完整的 Agentic 看板阶段。
                  </CardDescription>
                  <CreateProjectDialog label="新增项目" />
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}
      </section>
    </AdminShell>
  )
}
