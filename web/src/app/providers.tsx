import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { queryClient } from '@/lib/query-client'
import { ThemeProvider } from '@/theme'
import { basePath } from '@/lib/runtime'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={basePath || undefined}>{children}</BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
