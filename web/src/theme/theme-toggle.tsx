import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from './theme-provider'

export function ThemeToggle({ dataTestId }: { dataTestId: string }) {
  const { mode, toggleMode } = useTheme()
  const nextLabel = mode === 'dark' ? '切换到日间模式' : '切换到夜间模式'

  return (
    <Button aria-label={nextLabel} data-test-id={dataTestId} onClick={toggleMode} size="icon" variant="ghost">
      {mode === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}
