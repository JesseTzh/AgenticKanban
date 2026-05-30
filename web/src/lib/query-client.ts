import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

export const queryKeys = {
  projects: ['projects'] as const,
  board: (projectID: string) => ['projects', projectID, 'board'] as const,
  tasks: (projectID: string) => ['projects', projectID, 'tasks'] as const,
  repos: (projectID: string) => ['projects', projectID, 'repositories'] as const,
  commits: (projectID: string) => ['projects', projectID, 'commits'] as const,
  archives: (projectID: string) => ['projects', projectID, 'archives'] as const,
}
