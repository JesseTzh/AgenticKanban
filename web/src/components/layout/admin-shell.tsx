import type { ReactNode } from 'react'
import { FolderKanban, GitBranch, LayoutDashboard, LogOut } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type AdminShellProps = {
  children: ReactNode
  title: string
  projectID?: string
}

export function AdminShell({ children, title, projectID }: AdminShellProps) {
  const location = useLocation()
  const items = [
    { label: '项目列表', href: '/', icon: LayoutDashboard },
    ...(projectID
      ? [
          { label: '任务看板', href: `/projects/${projectID}`, icon: FolderKanban },
          { label: '仓库与交付物', href: `/projects/${projectID}/repositories`, icon: GitBranch },
        ]
      : []),
  ]

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card md:block">
        <div className="flex h-16 items-center px-6 text-lg font-semibold">AgenticKanban</div>
        <Separator />
        <nav className="space-y-1 p-3">
          {items.map(({ label, href, icon: Icon }) => (
            <Link
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                location.pathname === href && 'bg-accent font-medium text-accent-foreground',
              )}
              key={href}
              to={href}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="md:pl-64">
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-8">
          <h1 className="text-lg font-semibold">{title}</h1>
          <Button
            onClick={() => api.logout().finally(() => (window.location.href = '/login'))}
            size="sm"
            variant="outline"
          >
            <LogOut className="size-4" />
            退出
          </Button>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
