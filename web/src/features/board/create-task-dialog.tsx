import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-client'

export function CreateTaskDialog({ projectID }: { projectID: string }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const mutation = useMutation({
    mutationFn: () => api.createTask(projectID, { Title: title, Description: '', Status: 'not_ready' }),
    onSuccess: async () => {
      setTitle('')
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectID) })
    },
  })
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild><Button data-test-id="create-task-open"><Plus className="size-4" />创建任务</Button></DialogTrigger>
      <DialogContent data-test-id="create-task-dialog">
        <DialogHeader data-test-id="create-task-header"><DialogTitle data-test-id="create-task-dialog-title">创建需求任务</DialogTitle><DialogDescription data-test-id="create-task-description">任务会进入需求澄清阶段。</DialogDescription></DialogHeader>
        <form className="space-y-4" data-test-id="create-task-form" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}>
          <div className="space-y-2" data-test-id="create-task-title-field"><Label data-test-id="create-task-title-label" htmlFor="task-title">任务标题</Label><Input data-test-id="create-task-title" id="task-title" onChange={(event) => setTitle(event.target.value)} required value={title} /></div>
          <DialogFooter data-test-id="create-task-footer"><Button data-test-id="create-task-submit" disabled={mutation.isPending} type="submit">创建任务</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
