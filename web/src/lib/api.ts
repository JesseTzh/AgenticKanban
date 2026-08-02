import type { AgentKey, AgentWorkDetail, Commit, CreatedAgentKey, Project, Repository, Stage, Task } from '@/types'
import { demoAgentKeys, demoAgentWork, demoCommits, demoProjects, demoRepositories, demoStages, demoTasks } from '@/lib/demo-data'
import { appPath, isDemoMode } from '@/lib/runtime'

type APIEnvelope<T> = {
  data: T | null
  error: { code: string; message: string } | null
}

type LocationLike = {
  href: string
  pathname: string
}

export function redirectToLogin(location: LocationLike = window.location) {
  const loginPath = appPath('/login')
  if (location.pathname !== loginPath) {
    location.href = loginPath
  }
}

function demoResponse<T>(path: string): T {
  if (path === '/api/projects') return demoProjects as T
  if (/^\/api\/projects\/[^/]+\/board$/.test(path)) return demoStages as T
  if (/^\/api\/projects\/[^/]+\/tasks$/.test(path)) return demoTasks as T
  if (/^\/api\/projects\/[^/]+\/repositories$/.test(path)) return demoRepositories as T
  if (/^\/api\/projects\/[^/]+\/commits$/.test(path)) return demoCommits as T
  if (/^\/api\/tasks\/[^/]+\/refs$/.test(path)) return demoTasks.slice(0, 1) as T
  if (/^\/api\/tasks\/[^/]+\/agent-work$/.test(path)) return demoAgentWork as T
  if (path === '/api/agent-tokens') return demoAgentKeys as T
  return {} as T
}

export async function request<T>(path: string, init: RequestInit = {}, location: LocationLike = window.location): Promise<T> {
  if (isDemoMode) return demoResponse<T>(path)
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...init,
  })
  let body: APIEnvelope<T> | undefined
  try {
    body = (await response.json()) as APIEnvelope<T>
  } catch {}
  if (!response.ok) {
    if (response.status === 401) {
      redirectToLogin(location)
    }
    let message = `${response.status} ${response.statusText}`
    message = body?.error?.message || message
    throw new Error(message)
  }
  if (!body || !Object.prototype.hasOwnProperty.call(body, 'data')) {
    throw new Error('invalid API response')
  }
  return body.data as T
}

export const api = {
  health: () => request<{ ok: boolean }>('/api/health'),
  login: (username: string, password: string, remember = false) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password, remember }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  projects: () => request<Project[]>('/api/projects'),
  createProject: (data: { Name: string; Description?: string }) =>
    request('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  board: (projectID: string) => request<Stage[]>(`/api/projects/${projectID}/board`),
  tasks: (projectID: string) => request<Task[]>(`/api/projects/${projectID}/tasks`),
  createTask: (projectID: string, data: unknown) =>
    request(`/api/projects/${projectID}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  markTaskAgentReady: (taskID: string) => request(`/api/tasks/${taskID}/agent-ready`, { method: 'POST' }),
  agentWork: (taskID: string) => request<AgentWorkDetail>(`/api/tasks/${taskID}/agent-work`),
  approveTask: (taskID: string, data: { Decision: string; Note: string }) =>
    request(`/api/tasks/${taskID}/approvals`, { method: 'POST', body: JSON.stringify(data) }),
  repos: (projectID: string) => request<Repository[]>(`/api/projects/${projectID}/repositories`),
  createRepo: (projectID: string, data: unknown) =>
    request(`/api/projects/${projectID}/repositories`, { method: 'POST', body: JSON.stringify(data) }),
  commits: (projectID: string) => request<Commit[]>(`/api/projects/${projectID}/commits`),
  testRecord: (taskID: string, data: { Verdict: string; Note: string }) =>
    request(`/api/tasks/${taskID}/tests`, { method: 'POST', body: JSON.stringify(data) }),
  completeTask: (taskID: string) => request(`/api/tasks/${taskID}/complete`, { method: 'POST' }),
  taskRefs: (taskID: string) => request<Task[]>(`/api/tasks/${taskID}/refs`),
  addTaskRef: (taskID: string, ReferencedTaskID: string) =>
    request(`/api/tasks/${taskID}/refs`, { method: 'POST', body: JSON.stringify({ ReferencedTaskID }) }),
  agentKeys: () => request<AgentKey[]>('/api/agent-tokens'),
  createAgentKey: (Name: string) =>
    request<CreatedAgentKey>('/api/agent-tokens', { method: 'POST', body: JSON.stringify({ Name }) }),
}
