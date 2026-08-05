import { Laptop, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from './theme-provider'
import type { ThemePreference } from './tokens'

const themeOptions: Record<ThemePreference, { label: string; next: ThemePreference }> = {
  auto: { label: '自动切换', next: 'light' },
  light: { label: '日间模式', next: 'dark' },
  dark: { label: '夜间模式', next: 'auto' },
}

export function ThemeToggle({ dataTestId }: { dataTestId: string }) {
  const { mode, preference, setPreference } = useTheme()
  const Icon = preference === 'auto' ? Laptop : mode === 'dark' ? Moon : Sun
  const current = themeOptions[preference]

  return (
    <div className="group/theme relative" data-testid={`${dataTestId}-container`}>
      <Button
        aria-label={`当前显示模式：${current.label}，点击切换`}
        data-testid={dataTestId}
        onClick={() => setPreference(current.next)}
        size="icon"
        title={`当前：${current.label}`}
        variant="ghost"
      >
        <Icon data-testid={`${dataTestId}-icon`} />
      </Button>
      <span
        className="pointer-events-none absolute right-0 top-[calc(100%+0.5rem)] z-50 w-max rounded-sm bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground opacity-0 shadow-menu outline outline-1 outline-outline transition-opacity group-hover/theme:opacity-100 group-focus-within/theme:opacity-100"
        data-testid={`${dataTestId}-status`}
        role="tooltip"
      >
        当前：{current.label}
      </span>
    </div>
  )
}
