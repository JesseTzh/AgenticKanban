import { afterEach, describe, expect, it, vi } from 'vitest'
import { request } from './api'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('API request envelope', () => {
  it('returns successful response data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: [{ ID: 'project-1' }], error: null })))

    await expect(request('/api/projects')).resolves.toEqual([{ ID: 'project-1' }])
  })

  it('uses the structured API error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: null, error: { code: 'locked', message: 'task locked' } }, 409)))

    await expect(request('/api/tasks/task-1')).rejects.toThrow('task locked')
  })

  it('redirects unauthorized protected-page requests to login', async () => {
    const location = { pathname: '/projects', href: '/projects' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: null, error: { code: 'unauthorized', message: 'unauthorized' } }, 401)))

    await expect(request('/api/projects', {}, location)).rejects.toThrow('unauthorized')
    expect(location.href).toBe('/login')
  })

  it('keeps unauthorized login requests on the login page', async () => {
    const location = { pathname: '/login', href: '/login' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: null, error: { code: 'invalid_credentials', message: 'invalid credentials' } }, 401)))

    await expect(request('/api/auth/login', {}, location)).rejects.toThrow('invalid credentials')
    expect(location.href).toBe('/login')
  })
})
