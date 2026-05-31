import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-client'

export function CreateProjectDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const mutation = useMutation({
    mutationFn: () => api.createProject({ Name: name }),
    onSuccess: async () => {
      setName('')
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button data-test-id="create-project-open"><Plus className="size-4" />新建项目</Button>
      </DialogTrigger>
      <DialogContent data-test-id="create-project-dialog">
        <DialogHeader data-test-id="create-project-header">
          <DialogTitle data-test-id="create-project-title">新建项目</DialogTitle>
          <DialogDescription data-test-id="create-project-description">创建项目后会生成默认 AgenticKanban 工作流。</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" data-test-id="create-project-form" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}>
          <div className="space-y-2" data-test-id="create-project-name-field">
            <Label data-test-id="create-project-name-label" htmlFor="project-name">项目名称</Label>
            <Input data-test-id="create-project-name" id="project-name" onChange={(event) => setName(event.target.value)} required value={name} />
          </div>
          <DialogFooter data-test-id="create-project-footer">
            <Button data-test-id="create-project-submit" disabled={mutation.isPending} type="submit">{mutation.isPending ? '创建中...' : '创建项目'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
