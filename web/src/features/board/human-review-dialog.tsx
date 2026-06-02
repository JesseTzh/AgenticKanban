import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-client'

export function HumanReviewDialog({ onOpenChange, open, projectID, taskID }: { onOpenChange: (open: boolean) => void; open: boolean; projectID: string; taskID: string }) {
  const [note, setNote] = useState('')
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (Decision: string) => api.approveTask(taskID, { Decision, Note: note }),
    onSuccess: async () => {
      setNote('')
      onOpenChange(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectID) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.agentWork(taskID) }),
      ])
    },
  })
  const close = (nextOpen: boolean) => {
    if (!nextOpen) setNote('')
    onOpenChange(nextOpen)
  }
  return (
    <Dialog onOpenChange={close} open={open}>
      <DialogContent data-test-id={`human-review-dialog-${taskID}`}>
        <DialogHeader data-test-id={`human-review-header-${taskID}`}>
          <DialogTitle data-test-id={`human-review-title-${taskID}`}>人工审核 Agent 结果</DialogTitle>
          <DialogDescription data-test-id={`human-review-description-${taskID}`}>填写审核意见后确认是否接受本次 Agent 输出。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2" data-test-id={`human-review-note-field-${taskID}`}>
          <Label data-test-id={`human-review-note-label-${taskID}`} htmlFor={`human-review-note-${taskID}`}>审核意见</Label>
          <Input data-test-id={`human-review-note-${taskID}`} id={`human-review-note-${taskID}`} onChange={(event) => setNote(event.target.value)} required value={note} />
        </div>
        <DialogFooter data-test-id={`human-review-footer-${taskID}`}>
          <Button data-test-id={`human-review-reject-${taskID}`} disabled={!note || mutation.isPending} onClick={() => mutation.mutate('rejected')} type="button" variant="outline">退回重做</Button>
          <Button data-test-id={`human-review-approve-${taskID}`} disabled={!note || mutation.isPending} onClick={() => mutation.mutate('approved')} type="button">审核通过</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
