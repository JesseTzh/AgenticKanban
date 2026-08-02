import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-client'

export function CreateRepositoryDialog({ projectID }: { projectID: string }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [url, setURL] = useState('')
  const mutation = useMutation({
    mutationFn: () => api.createRepo(projectID, { Name: name, GitURL: url, WebhookEnabled: true }),
    onSuccess: async () => {
      setName('')
      setURL('')
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: queryKeys.repos(projectID) })
    },
  })
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild><Button data-testid="create-repository-open"><Plus className="size-4" />新增仓库</Button></DialogTrigger>
      <DialogContent data-testid="create-repository-dialog">
        <DialogHeader data-testid="create-repository-header"><DialogTitle data-testid="create-repository-title">新增 Git 仓库</DialogTitle><DialogDescription data-testid="create-repository-description">保存后会生成用于同步 Commit 的 Webhook 地址。</DialogDescription></DialogHeader>
        <form className="space-y-4" data-testid="create-repository-form" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}>
          <div className="space-y-2" data-testid="create-repository-name-field"><Label data-testid="create-repository-name-label" htmlFor="repository-name">仓库名称</Label><Input data-testid="create-repository-name" id="repository-name" onChange={(event) => setName(event.target.value)} required value={name} /></div>
          <div className="space-y-2" data-testid="create-repository-url-field"><Label data-testid="create-repository-url-label" htmlFor="repository-url">Git URL</Label><Input data-testid="create-repository-url" id="repository-url" onChange={(event) => setURL(event.target.value)} required value={url} /></div>
          <DialogFooter data-testid="create-repository-footer"><Button data-testid="create-repository-submit" disabled={mutation.isPending} type="submit">保存仓库</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
