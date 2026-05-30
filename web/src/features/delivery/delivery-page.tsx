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
      <div className="mb-6 flex items-center justify-between">
        <div><h2 className="text-2xl font-semibold">仓库与交付物</h2><p className="text-sm text-muted-foreground">管理 Webhook、查看同步 Commit，并浏览任务归档。</p></div>
        <CreateRepositoryDialog projectID={projectID} />
      </div>
      <ErrorAlert error={repos.error || commits.error || archives.error} />
      {pending ? <PageLoading /> : null}
      {!pending ? (
        <Tabs defaultValue="repositories">
          <TabsList>
            <TabsTrigger value="repositories">仓库</TabsTrigger>
            <TabsTrigger value="commits">Commit</TabsTrigger>
            <TabsTrigger value="archives">归档</TabsTrigger>
          </TabsList>
          <TabsContent value="repositories">
            <Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>仓库</TableHead><TableHead>Git URL</TableHead><TableHead>Webhook</TableHead><TableHead>状态</TableHead></TableRow></TableHeader><TableBody>
              {repos.data?.map((repo) => <TableRow key={repo.ID}><TableCell className="font-medium">{repo.Name}</TableCell><TableCell>{repo.GitURL}</TableCell><TableCell className="max-w-xs break-all font-mono text-xs">/api/webhooks/{repo.ID}/{repo.WebhookSecret}</TableCell><TableCell><Badge variant={repo.WebhookEnabled ? 'secondary' : 'outline'}>{repo.WebhookEnabled ? '启用' : '禁用'}</Badge></TableCell></TableRow>)}
            </TableBody></Table></CardContent></Card>
          </TabsContent>
          <TabsContent value="commits">
            <Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>SHA</TableHead><TableHead>消息</TableHead><TableHead>作者</TableHead><TableHead>分支</TableHead></TableRow></TableHeader><TableBody>
              {commits.data?.map((commit) => <TableRow key={commit.ID}><TableCell className="font-mono text-xs">{commit.SHA}</TableCell><TableCell>{commit.Message}</TableCell><TableCell>{commit.Author}</TableCell><TableCell>{commit.Branch}</TableCell></TableRow>)}
            </TableBody></Table></CardContent></Card>
          </TabsContent>
          <TabsContent className="grid gap-4 md:grid-cols-2" value="archives">
            {archives.data?.map((archive) => <Card key={archive.ID}><CardHeader><CardTitle className="text-base">归档版本 {archive.Version}</CardTitle></CardHeader><CardContent><pre className="overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{archive.Content}</pre></CardContent></Card>)}
          </TabsContent>
        </Tabs>
      ) : null}
    </AdminShell>
  )
}
