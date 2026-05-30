import type { Archive, Commit, Project, Repository, Stage, Task } from '@/types'

type APIEnvelope<T> = {
  data: T | null
  error: { code: string; message: string } | null
}

type LocationLike = {
  href: string
  pathname: string
}

export function redirectToLogin(location: LocationLike = window.location) {
  if (location.pathname !== '/login') {
    location.href = '/login'
  }
}

export async function request<T>(path: string, init: RequestInit = {}, location: LocationLike = window.location): Promise<T> {
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
  login: (username: string, password: string) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  projects: () => request<Project[]>('/api/projects'),
  createProject: (data: { Name: string; Description?: string }) =>
    request('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  board: (projectID: string) => request<Stage[]>(`/api/projects/${projectID}/board`),
  tasks: (projectID: string) => request<Task[]>(`/api/projects/${projectID}/tasks`),
  createTask: (projectID: string, data: unknown) =>
    request(`/api/projects/${projectID}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  transitionTask: (taskID: string, data: { StageKey: string; Status: string; Reason: string }) =>
    request(`/api/tasks/${taskID}/transitions`, { method: 'POST', body: JSON.stringify(data) }),
  repos: (projectID: string) => request<Repository[]>(`/api/projects/${projectID}/repositories`),
  createRepo: (projectID: string, data: unknown) =>
    request(`/api/projects/${projectID}/repositories`, { method: 'POST', body: JSON.stringify(data) }),
  commits: (projectID: string) => request<Commit[]>(`/api/projects/${projectID}/commits`),
  review: (taskID: string, data: { Verdict: string; Note: string }) =>
    request(`/api/tasks/${taskID}/reviews`, { method: 'POST', body: JSON.stringify(data) }),
  testRecord: (taskID: string, data: { Verdict: string; Note: string }) =>
    request(`/api/tasks/${taskID}/tests`, { method: 'POST', body: JSON.stringify(data) }),
  createArchive: (taskID: string, Content: string) =>
    request(`/api/tasks/${taskID}/archives`, { method: 'POST', body: JSON.stringify({ Content }) }),
  archives: (projectID: string) => request<Archive[]>(`/api/projects/${projectID}/archives`),
}
