import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { AdminShell } from '@/components/layout/admin-shell'
import { ErrorAlert } from '@/components/layout/error-alert'
import { PageLoading } from '@/components/layout/page-loading'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-client'
import { CreateRepositoryDialog } from './create-repository-dialog'

export function DeliveryPage() {
  const { projectID = '' } = useParams()
  const repos = useQuery({ queryKey: queryKeys.repos(projectID), queryFn: () => api.repos(projectID) })
  const commits = useQuery({ queryKey: queryKeys.commits(projectID), queryFn: () => api.commits(projectID) })
  const archives = useQuery({ queryKey: queryKeys.archives(projectID), queryFn: () => api.archives(projectID) })
  const pending = repos.isPending || commits.isPending || archives.isPending
  return (
    <AdminShell projectID={projectID} title="仓库与交付物">
      <div className="mb-6 flex items-center justify-between" data-test-id="delivery-heading">
        <div data-test-id="delivery-heading-copy"><h2 className="text-2xl font-semibold" data-test-id="delivery-title">仓库与交付物</h2><p className="text-sm text-muted-foreground" data-test-id="delivery-description">管理 Webhook、查看同步 Commit，并浏览任务归档。</p></div>
        <CreateRepositoryDialog projectID={projectID} />
      </div>
      <ErrorAlert error={repos.error || commits.error || archives.error} />
      {pending ? <PageLoading /> : null}
      {!pending ? (
        <Tabs data-test-id="delivery-tabs" defaultValue="repositories">
          <TabsList data-test-id="delivery-tabs-list">
            <TabsTrigger data-test-id="delivery-tab-repositories" value="repositories">仓库</TabsTrigger>
            <TabsTrigger data-test-id="delivery-tab-commits" value="commits">Commit</TabsTrigger>
            <TabsTrigger data-test-id="delivery-tab-archives" value="archives">归档</TabsTrigger>
          </TabsList>
          <TabsContent data-test-id="delivery-repositories-content" value="repositories">
            <Card data-test-id="repositories-panel"><CardContent className="pt-6" data-test-id="repositories-panel-content"><Table data-test-id="repositories-table"><TableHeader><TableRow><TableHead>仓库</TableHead><TableHead>Git URL</TableHead><TableHead>Webhook</TableHead><TableHead>状态</TableHead></TableRow></TableHeader><TableBody>
              {repos.data?.map((repo) => <TableRow data-test-id={`repository-row-${repo.ID}`} key={repo.ID}><TableCell className="font-medium">{repo.Name}</TableCell><TableCell>{repo.GitURL}</TableCell><TableCell className="max-w-xs break-all font-mono text-xs">/api/webhooks/{repo.ID}/{repo.WebhookSecret}</TableCell><TableCell><Badge variant={repo.WebhookEnabled ? 'secondary' : 'outline'}>{repo.WebhookEnabled ? '启用' : '禁用'}</Badge></TableCell></TableRow>)}
            </TableBody></Table></CardContent></Card>
          </TabsContent>
          <TabsContent data-test-id="delivery-commits-content" value="commits">
            <Card data-test-id="commits-panel"><CardContent className="pt-6" data-test-id="commits-panel-content"><Table data-test-id="commits-table"><TableHeader><TableRow><TableHead>SHA</TableHead><TableHead>消息</TableHead><TableHead>作者</TableHead><TableHead>分支</TableHead></TableRow></TableHeader><TableBody>
              {commits.data?.map((commit) => <TableRow data-test-id={`commit-row-${commit.ID}`} key={commit.ID}><TableCell className="font-mono text-xs">{commit.SHA}</TableCell><TableCell>{commit.Message}</TableCell><TableCell>{commit.Author}</TableCell><TableCell>{commit.Branch}</TableCell></TableRow>)}
            </TableBody></Table></CardContent></Card>
          </TabsContent>
          <TabsContent className="grid gap-4 md:grid-cols-2" data-test-id="delivery-archives-content" value="archives">
            {archives.data?.map((archive) => <Card data-test-id={`archive-card-${archive.ID}`} key={archive.ID}><CardHeader data-test-id={`archive-card-header-${archive.ID}`}><CardTitle className="text-base" data-test-id={`archive-card-title-${archive.ID}`}>归档版本 {archive.Version}</CardTitle></CardHeader><CardContent data-test-id={`archive-card-content-${archive.ID}`}><pre className="overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs" data-test-id={`archive-content-${archive.ID}`}>{archive.Content}</pre></CardContent></Card>)}
          </TabsContent>
        </Tabs>
      ) : null}
    </AdminShell>
  )
}
