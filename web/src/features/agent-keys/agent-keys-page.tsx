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
      <section data-testid="agent-keys-page">
        <header className="page-heading" data-testid="agent-keys-heading">
          <div className="page-heading-copy" data-testid="agent-keys-heading-copy">
            <p className="page-eyebrow" data-testid="agent-keys-eyebrow">ACCESS CONTROL</p>
            <h1 className="page-title" data-testid="agent-keys-title">Agent 密钥</h1>
            <p className="page-description" data-testid="agent-keys-description">为 Agent 创建独立访问密钥，系统会按密钥记录任务执行来源。</p>
          </div>
          <div className="page-heading-actions" data-testid="agent-keys-heading-actions"><CreateAgentKeyDialog /></div>
        </header>
        <ErrorAlert error={keys.error} />
        {keys.isPending ? <PageLoading /> : null}
        {!keys.isPending && keys.data?.length === 0 ? <p className="material-panel rounded-lg p-8 text-center text-muted-foreground" data-testid="agent-keys-empty">暂无 Agent 密钥</p> : null}
        {keys.data?.length ? (
          <div className="data-panel" data-testid="agent-keys-table-panel"><Table data-testid="agent-keys-table">
            <TableHeader data-testid="agent-keys-table-header"><TableRow data-testid="agent-keys-table-header-row"><TableHead data-testid="agent-keys-table-name-heading">名称</TableHead><TableHead data-testid="agent-keys-table-owner-heading">所属用户</TableHead><TableHead data-testid="agent-keys-table-created-heading">创建时间</TableHead></TableRow></TableHeader>
            <TableBody data-testid="agent-keys-table-body">
              {keys.data.map((key) => <TableRow data-testid={`agent-key-row-${key.id}`} key={key.id}><TableCell data-testid={`agent-key-name-${key.id}`}>{key.name}</TableCell><TableCell data-testid={`agent-key-owner-${key.id}`}>{key.owner_username}</TableCell><TableCell data-testid={`agent-key-created-${key.id}`}>{key.created_at}</TableCell></TableRow>)}
            </TableBody>
          </Table></div>
        ) : null}
      </section>
    </AdminShell>
  )
}
