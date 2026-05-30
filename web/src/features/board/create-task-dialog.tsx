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
      <DialogTrigger asChild><Button><Plus className="size-4" />创建任务</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>创建需求任务</DialogTitle><DialogDescription>任务会进入需求澄清阶段。</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}>
          <div className="space-y-2"><Label htmlFor="task-title">任务标题</Label><Input id="task-title" onChange={(event) => setTitle(event.target.value)} required value={title} /></div>
          <DialogFooter><Button disabled={mutation.isPending} type="submit">创建任务</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
