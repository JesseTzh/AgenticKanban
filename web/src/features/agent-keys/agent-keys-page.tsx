import { useQuery } from '@tanstack/react-query'
import { AdminShell } from '@/components/layout/admin-shell'
import { ErrorAlert } from '@/components/layout/error-alert'
import { PageLoading } from '@/components/layout/page-loading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-client'
import { CreateAgentKeyDialog } from './create-agent-key-dialog'

export function AgentKeysPage() {
  const keys = useQuery({ queryKey: queryKeys.agentKeys, queryFn: api.agentKeys })
  return (
    <AdminShell title="Agent 密钥">
      <section className="grid gap-6" data-test-id="agent-keys-page">
        <header className="flex items-start justify-between gap-4" data-test-id="agent-keys-heading">
          <div data-test-id="agent-keys-heading-copy">
            <h2 className="text-2xl font-semibold" data-test-id="agent-keys-title">Agent 密钥</h2>
            <p className="text-sm text-muted-foreground" data-test-id="agent-keys-description">为 Agent 创建独立访问密钥，系统会按密钥记录任务执行来源。</p>
          </div>
          <CreateAgentKeyDialog />
        </header>
        <ErrorAlert error={keys.error} />
        {keys.isPending ? <PageLoading /> : null}
        {!keys.isPending && keys.data?.length === 0 ? <p className="material-panel rounded-lg p-8 text-center text-muted-foreground" data-test-id="agent-keys-empty">暂无 Agent 密钥</p> : null}
        {keys.data?.length ? (
          <Table data-test-id="agent-keys-table">
            <TableHeader data-test-id="agent-keys-table-header"><TableRow data-test-id="agent-keys-table-header-row"><TableHead data-test-id="agent-keys-table-name-heading">名称</TableHead><TableHead data-test-id="agent-keys-table-owner-heading">所属用户</TableHead><TableHead data-test-id="agent-keys-table-created-heading">创建时间</TableHead></TableRow></TableHeader>
            <TableBody data-test-id="agent-keys-table-body">
              {keys.data.map((key) => <TableRow data-test-id={`agent-key-row-${key.id}`} key={key.id}><TableCell data-test-id={`agent-key-name-${key.id}`}>{key.name}</TableCell><TableCell data-test-id={`agent-key-owner-${key.id}`}>{key.owner_username}</TableCell><TableCell data-test-id={`agent-key-created-${key.id}`}>{key.created_at}</TableCell></TableRow>)}
            </TableBody>
          </Table>
        ) : null}
      </section>
    </AdminShell>
  )
}
