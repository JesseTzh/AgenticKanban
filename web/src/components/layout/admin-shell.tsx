import type { ReactNode } from 'react'
import { Info, KeyRound, LogOut, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'
import { appVersion, isDemoMode } from '@/lib/runtime'
import { ThemeToggle } from '@/theme'

type AdminShellProps = {
  children: ReactNode
  title: string
  projectID?: string
}

export function AdminShell({ children, title }: AdminShellProps) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background" data-testid="admin-shell">
      <header
        className="sticky top-0 z-40 bg-glass shadow-[0_8px_24px_rgb(0_30_45/0.05)] backdrop-blur-[20px] dark:shadow-[0_8px_24px_rgb(0_212_236/0.04)]"
        data-testid="admin-topbar"
      >
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-4 md:px-8" data-testid="admin-topbar-inner">
          <Link
            aria-label="返回项目列表"
            className="flex items-center gap-1 text-[19px] font-semibold leading-none tracking-[-0.03em]"
            data-testid="admin-brand"
            to="/projects"
          >
            <span className="text-primary" data-testid="admin-brand-agentic">Agentic</span>
            <span data-testid="admin-brand-kanban">Kanban</span>
          </Link>
          <div className="flex items-center gap-1.5" data-testid="admin-topbar-actions">
            <ThemeToggle dataTestId="admin-theme-toggle" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2" data-testid="admin-profile-trigger" size="sm" variant="ghost">
                  <UserRound data-testid="admin-profile-icon" />
                  <span className="hidden sm:inline" data-testid="admin-profile-label">个人</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48" data-testid="admin-profile-menu">
                <DropdownMenuLabel data-testid="admin-profile-menu-label">个人设置</DropdownMenuLabel>
                <DropdownMenuSeparator data-testid="admin-profile-menu-separator" />
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground" data-testid="admin-version-tag" title={`版本 ${appVersion}`}>
                  <Info data-testid="admin-version-icon" />
                  <span className="font-mono" data-testid="admin-version-text">ver.{appVersion}</span>
                </div>
                <DropdownMenuItem asChild data-testid="admin-profile-agent-keys">
                  <Link data-testid="admin-profile-agent-keys-link" to="/agent-keys">
                    <KeyRound data-testid="admin-profile-agent-keys-icon" />
                    Agent 密钥
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="admin-profile-logout"
                  onSelect={() => {
                    void api.logout().finally(() => navigate('/login'))
                  }}
                >
                  <LogOut data-testid="admin-profile-logout-icon" />
                  {isDemoMode ? '返回登录' : '退出登录'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main
        aria-label={title}
        className="admin-main relative min-h-[calc(100vh-4rem)] overflow-hidden px-4 py-6 md:px-8 md:py-8"
        data-testid="admin-content"
      >
        <div className="admin-main-grid" data-testid="admin-main-grid" />
        <div className="admin-main-glow" data-testid="admin-main-glow" />
        <div className="relative z-10 mx-auto w-full max-w-[1600px]" data-testid="admin-workspace">
          {children}
        </div>
      </main>
    </div>
  )
}
