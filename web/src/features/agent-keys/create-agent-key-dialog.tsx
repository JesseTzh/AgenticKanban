import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-client'
import type { CreatedAgentKey } from '@/types'

export function CreateAgentKeyDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [created, setCreated] = useState<CreatedAgentKey>()
  const mutation = useMutation({
    mutationFn: () => api.createAgentKey(name),
    onSuccess: async (key) => {
      setCreated(key)
      await queryClient.invalidateQueries({ queryKey: queryKeys.agentKeys })
    },
  })
  const changeOpen = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setName('')
      setCreated(undefined)
    }
  }
  return (
    <Dialog onOpenChange={changeOpen} open={open}>
      <DialogTrigger asChild><Button data-test-id="create-agent-key-open"><Plus className="size-4" />创建密钥</Button></DialogTrigger>
      <DialogContent data-test-id="create-agent-key-dialog">
        <DialogHeader data-test-id="create-agent-key-header">
          <DialogTitle data-test-id="create-agent-key-title">创建 Agent 密钥</DialogTitle>
          <DialogDescription data-test-id="create-agent-key-description">使用 Bearer 密钥访问 Agent 专用接口。</DialogDescription>
        </DialogHeader>
        {created ? (
          <div className="grid gap-3" data-test-id="create-agent-key-result">
            <p className="text-sm text-muted-foreground" data-test-id="create-agent-key-warning">该密钥仅展示一次，请立即妥善保存。</p>
            <code className="break-all rounded-md border bg-muted p-3 text-sm" data-test-id="create-agent-key-token">{created.token}</code>
          </div>
        ) : (
          <form className="grid gap-4" data-test-id="create-agent-key-form" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}>
            <div className="grid gap-2" data-test-id="create-agent-key-name-field">
              <Label data-test-id="create-agent-key-name-label" htmlFor="create-agent-key-name">密钥名称</Label>
              <Input data-test-id="create-agent-key-name" id="create-agent-key-name" onChange={(event) => setName(event.target.value)} required value={name} />
            </div>
            <DialogFooter data-test-id="create-agent-key-footer"><Button data-test-id="create-agent-key-submit" disabled={!name || mutation.isPending} type="submit">生成密钥</Button></DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
