import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { AdminShell } from '@/components/layout/admin-shell'
import { ErrorAlert } from '@/components/layout/error-alert'
import { PageLoading } from '@/components/layout/page-loading'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-client'
import { CreateRepositoryDialog } from './create-repository-dialog'

export function DeliveryPage() {
  const { projectID = '' } = useParams()
  const repos = useQuery({ queryKey: queryKeys.repos(projectID), queryFn: () => api.repos(projectID) })
  const commits = useQuery({ queryKey: queryKeys.commits(projectID), queryFn: () => api.commits(projectID) })
  const pending = repos.isPending || commits.isPending
  return (
    <AdminShell projectID={projectID} title="仓库与交付物">
      <header className="page-heading" data-testid="delivery-heading">
        <div className="page-heading-copy" data-testid="delivery-heading-copy">
          <p className="page-eyebrow" data-testid="delivery-eyebrow">DELIVERY SOURCES</p>
          <h1 className="page-title" data-testid="delivery-title">仓库与交付物</h1>
          <p className="page-description" data-testid="delivery-description">管理 Webhook，并查看同步 Commit。</p>
        </div>
        <div className="page-heading-actions" data-testid="delivery-heading-actions">
          <CreateRepositoryDialog projectID={projectID} />
        </div>
      </header>
      <ErrorAlert error={repos.error || commits.error} />
      {pending ? <PageLoading /> : null}
      {!pending ? (
        <Tabs className="space-y-4" data-testid="delivery-tabs" defaultValue="repositories">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto" data-testid="delivery-tabs-list">
            <TabsTrigger data-testid="delivery-tab-repositories" value="repositories">仓库</TabsTrigger>
            <TabsTrigger data-testid="delivery-tab-commits" value="commits">Commit</TabsTrigger>
          </TabsList>
          <TabsContent className="mt-0" data-testid="delivery-repositories-content" value="repositories">
            <Card className="overflow-hidden rounded-sm rounded-br-xl" data-testid="repositories-panel">
              <CardContent className="p-0" data-testid="repositories-panel-content">
                <Table data-testid="repositories-table">
                  <TableHeader data-testid="repositories-table-header">
                    <TableRow data-testid="repositories-table-header-row">
                      <TableHead className="min-w-40 px-4" data-testid="repositories-table-name-heading">仓库</TableHead>
                      <TableHead className="min-w-64" data-testid="repositories-table-url-heading">Git URL</TableHead>
                      <TableHead className="min-w-72" data-testid="repositories-table-webhook-heading">Webhook</TableHead>
                      <TableHead className="w-24 px-4" data-testid="repositories-table-status-heading">状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody data-testid="repositories-table-body">
                    {repos.data?.map((repo) => (
                      <TableRow data-testid={`repository-row-${repo.ID}`} key={repo.ID}>
                        <TableCell className="px-4 font-medium" data-testid={`repository-name-${repo.ID}`}>{repo.Name}</TableCell>
                        <TableCell data-testid={`repository-url-${repo.ID}`}>{repo.GitURL}</TableCell>
                        <TableCell className="max-w-xs break-all font-mono text-xs" data-testid={`repository-webhook-${repo.ID}`}>/api/webhooks/{repo.ID}/{repo.WebhookSecret}</TableCell>
                        <TableCell className="px-4" data-testid={`repository-status-${repo.ID}`}><Badge data-testid={`repository-status-badge-${repo.ID}`} variant={repo.WebhookEnabled ? 'secondary' : 'outline'}>{repo.WebhookEnabled ? '启用' : '禁用'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent className="mt-0" data-testid="delivery-commits-content" value="commits">
            <Card className="overflow-hidden rounded-sm rounded-br-xl" data-testid="commits-panel">
              <CardContent className="p-0" data-testid="commits-panel-content">
                <Table data-testid="commits-table">
                  <TableHeader data-testid="commits-table-header">
                    <TableRow data-testid="commits-table-header-row">
                      <TableHead className="min-w-40 px-4" data-testid="commits-table-sha-heading">SHA</TableHead>
                      <TableHead className="min-w-80" data-testid="commits-table-message-heading">消息</TableHead>
                      <TableHead className="min-w-40" data-testid="commits-table-author-heading">作者</TableHead>
                      <TableHead className="min-w-32 px-4" data-testid="commits-table-branch-heading">分支</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody data-testid="commits-table-body">
                    {commits.data?.map((commit) => (
                      <TableRow data-testid={`commit-row-${commit.ID}`} key={commit.ID}>
                        <TableCell className="px-4 font-mono text-xs" data-testid={`commit-sha-${commit.ID}`}>{commit.SHA}</TableCell>
                        <TableCell data-testid={`commit-message-${commit.ID}`}>{commit.Message}</TableCell>
                        <TableCell data-testid={`commit-author-${commit.ID}`}>{commit.Author}</TableCell>
                        <TableCell className="px-4" data-testid={`commit-branch-${commit.ID}`}>{commit.Branch}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </AdminShell>
  )
}
