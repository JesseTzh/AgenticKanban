import { useState, type ReactNode } from 'react'
import { FolderKanban, GitBranch, KeyRound, LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/theme'
import { isDemoMode } from '@/lib/runtime'

type AdminShellProps = {
  children: ReactNode
  title: string
  projectID?: string
}

export function AdminShell({ children, title, projectID }: AdminShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const items = [
    { label: '项目列表', href: '/projects', icon: LayoutDashboard, testID: 'projects' },
    { label: 'Agent 密钥', href: '/agent-keys', icon: KeyRound, testID: 'agent-keys' },
    ...(projectID
      ? [
          { label: '任务看板', href: `/projects/${projectID}`, icon: FolderKanban, testID: 'board' },
          { label: '仓库与交付物', href: `/projects/${projectID}/repositories`, icon: GitBranch, testID: 'delivery' },
        ]
      : []),
  ]

  return (
    <div className={cn('min-h-screen bg-background md:grid', sidebarOpen && 'md:grid-cols-[max-content_minmax(0,1fr)]')} data-testid="admin-shell">
      {sidebarOpen && (
        <aside className="sticky top-0 hidden h-screen bg-surface-low shadow-card outline outline-1 outline-outline md:block" data-testid="admin-sidebar">
          <div className="flex h-16 items-center gap-1 px-6 text-lg font-semibold tracking-tight" data-testid="admin-brand">
            <span className="text-primary">Agentic</span>
            <span>Kanban</span>
          </div>
          <nav className="space-y-2 p-3" data-testid="admin-navigation">
            {items.map(({ label, href, icon: Icon, testID }) => (
              <Link
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                  location.pathname === href && 'bg-accent font-medium text-accent-foreground',
                )}
                data-testid={`admin-navigation-${testID}`}
                key={href}
                to={href}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>
      )}
      <div className="min-w-0" data-testid="admin-workspace">
        <header className="flex h-16 items-center justify-between bg-glass px-4 shadow-card outline outline-1 outline-outline backdrop-blur-[20px] md:px-8" data-testid="admin-topbar">
          <div className="flex items-center gap-2" data-testid="admin-topbar-leading">
            <Button
              aria-label={sidebarOpen ? '收起侧栏' : '展开侧栏'}
              className="hidden -ml-2 md:inline-flex"
              data-testid="admin-sidebar-toggle"
              onClick={() => setSidebarOpen((open) => !open)}
              size="icon"
              variant="ghost"
            >
              {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            </Button>
            <h1 className="text-lg font-semibold tracking-tight" data-testid="admin-page-title">{title}</h1>
          </div>
          <div className="flex items-center gap-2" data-testid="admin-topbar-actions">
            <ThemeToggle dataTestId="admin-theme-toggle" />
            <Button
              data-testid="admin-logout"
              onClick={() => api.logout().finally(() => navigate('/login'))}
              size="sm"
              variant="outline"
            >
              <LogOut className="size-4" />
              {isDemoMode ? '返回登录' : '退出'}
            </Button>
          </div>
        </header>
        <main className="p-4 md:p-8" data-testid="admin-content">{children}</main>
      </div>
    </div>
  )
}
