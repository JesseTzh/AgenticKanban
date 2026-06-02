import '@testing-library/jest-dom/vitest'
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/theme'
import { api } from '@/lib/api'
import { AgentKeysPage } from './agent-keys-page'

configure({ testIdAttribute: 'data-test-id' })

describe('AgentKeysPage', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
  })
  afterEach(() => vi.restoreAllMocks())

  it('lists metadata and shows plaintext only for the current creation dialog', async () => {
    vi.spyOn(api, 'agentKeys').mockResolvedValue([{ id: 'agent-1', name: 'existing', owner_id: 'user-1', owner_username: 'developer', created_at: '2026-06-01' }])
    vi.spyOn(api, 'createAgentKey').mockResolvedValue({ id: 'agent-2', name: 'codex-local', token: 'secret-once' })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

    render(<ThemeProvider><QueryClientProvider client={queryClient}><MemoryRouter><AgentKeysPage /></MemoryRouter></QueryClientProvider></ThemeProvider>)

    expect(await screen.findByText('existing')).toBeInTheDocument()
    expect(screen.getByTestId('admin-navigation-agent-keys')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('create-agent-key-open'))
    fireEvent.change(screen.getByTestId('create-agent-key-name'), { target: { value: 'codex-local' } })
    fireEvent.click(screen.getByTestId('create-agent-key-submit'))
    await waitFor(() => expect(api.createAgentKey).toHaveBeenCalledWith('codex-local'))
    expect(await screen.findByTestId('create-agent-key-token')).toHaveTextContent('secret-once')
    expect(screen.getByTestId('create-agent-key-warning')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Close'))
    fireEvent.click(screen.getByTestId('create-agent-key-open'))
    expect(screen.queryByText('secret-once')).not.toBeInTheDocument()
  })
})
