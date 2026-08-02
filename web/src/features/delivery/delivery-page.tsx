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
      <div className="mb-6 flex items-center justify-between" data-testid="delivery-heading">
        <div data-testid="delivery-heading-copy"><h2 className="text-2xl font-semibold" data-testid="delivery-title">仓库与交付物</h2><p className="text-sm text-muted-foreground" data-testid="delivery-description">管理 Webhook，并查看同步 Commit。</p></div>
        <CreateRepositoryDialog projectID={projectID} />
      </div>
      <ErrorAlert error={repos.error || commits.error} />
      {pending ? <PageLoading /> : null}
      {!pending ? (
        <Tabs data-testid="delivery-tabs" defaultValue="repositories">
          <TabsList data-testid="delivery-tabs-list">
            <TabsTrigger data-testid="delivery-tab-repositories" value="repositories">仓库</TabsTrigger>
            <TabsTrigger data-testid="delivery-tab-commits" value="commits">Commit</TabsTrigger>
          </TabsList>
          <TabsContent data-testid="delivery-repositories-content" value="repositories">
            <Card data-testid="repositories-panel"><CardContent className="pt-6" data-testid="repositories-panel-content"><Table data-testid="repositories-table"><TableHeader><TableRow><TableHead>仓库</TableHead><TableHead>Git URL</TableHead><TableHead>Webhook</TableHead><TableHead>状态</TableHead></TableRow></TableHeader><TableBody>
              {repos.data?.map((repo) => <TableRow data-testid={`repository-row-${repo.ID}`} key={repo.ID}><TableCell className="font-medium">{repo.Name}</TableCell><TableCell>{repo.GitURL}</TableCell><TableCell className="max-w-xs break-all font-mono text-xs">/api/webhooks/{repo.ID}/{repo.WebhookSecret}</TableCell><TableCell><Badge variant={repo.WebhookEnabled ? 'secondary' : 'outline'}>{repo.WebhookEnabled ? '启用' : '禁用'}</Badge></TableCell></TableRow>)}
            </TableBody></Table></CardContent></Card>
          </TabsContent>
          <TabsContent data-testid="delivery-commits-content" value="commits">
            <Card data-testid="commits-panel"><CardContent className="pt-6" data-testid="commits-panel-content"><Table data-testid="commits-table"><TableHeader><TableRow><TableHead>SHA</TableHead><TableHead>消息</TableHead><TableHead>作者</TableHead><TableHead>分支</TableHead></TableRow></TableHeader><TableBody>
              {commits.data?.map((commit) => <TableRow data-testid={`commit-row-${commit.ID}`} key={commit.ID}><TableCell className="font-mono text-xs">{commit.SHA}</TableCell><TableCell>{commit.Message}</TableCell><TableCell>{commit.Author}</TableCell><TableCell>{commit.Branch}</TableCell></TableRow>)}
            </TableBody></Table></CardContent></Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </AdminShell>
  )
}
