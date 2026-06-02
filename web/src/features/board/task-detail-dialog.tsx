import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-client'
import type { Task } from '@/types'

function DetailRow({ label, testID, value }: { label: string; testID: string; value: string }) {
  return (
    <div className="grid gap-1" data-test-id={`${testID}-row`}>
      <dt className="text-xs font-medium text-muted-foreground" data-test-id={`${testID}-label`}>{label}</dt>
      <dd className="text-sm" data-test-id={`${testID}-value`}>{value}</dd>
    </div>
  )
}

export function TaskDetailDialog({ onOpenChange, open, projectID, task }: { onOpenChange: (open: boolean) => void; open: boolean; projectID: string; task: Task }) {
  const [referencedTaskID, setReferencedTaskID] = useState('')
  const queryClient = useQueryClient()
  const tasks = useQuery({ enabled: open, queryKey: queryKeys.tasks(projectID), queryFn: () => api.tasks(projectID) })
  const refs = useQuery({ enabled: open, queryKey: queryKeys.taskRefs(task.ID), queryFn: () => api.taskRefs(task.ID) })
  const agentWork = useQuery({ enabled: open, queryKey: queryKeys.agentWork(task.ID), queryFn: () => api.agentWork(task.ID) })
  const addRef = useMutation({
    mutationFn: () => api.addTaskRef(task.ID, referencedTaskID),
    onSuccess: async () => {
      setReferencedTaskID('')
      await queryClient.invalidateQueries({ queryKey: queryKeys.taskRefs(task.ID) })
    },
  })
  const referencedIDs = new Set(refs.data?.map((ref) => ref.ID))
  const candidates = tasks.data?.filter((candidate) => candidate.ID !== task.ID && !referencedIDs.has(candidate.ID)) ?? []
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent data-test-id={`task-detail-dialog-${task.ID}`}>
        <DialogHeader data-test-id={`task-detail-header-${task.ID}`}>
          <DialogTitle data-test-id={`task-detail-title-${task.ID}`}>{task.Title}</DialogTitle>
          <DialogDescription data-test-id={`task-detail-description-${task.ID}`}>{task.Description || '暂无描述'}</DialogDescription>
        </DialogHeader>
        <dl className="grid gap-4 sm:grid-cols-2" data-test-id={`task-detail-fields-${task.ID}`}>
          <DetailRow label="阶段" testID={`task-detail-stage-${task.ID}`} value={task.StageKey} />
          <DetailRow label="状态" testID={`task-detail-status-${task.ID}`} value={task.Status} />
          <DetailRow label="负责人" testID={`task-detail-assignee-${task.ID}`} value={task.AgentID || '未分配'} />
          <DetailRow label="完成状态" testID={`task-detail-completed-${task.ID}`} value={task.Completed ? '已完成' : '未完成'} />
          <div className="grid gap-1" data-test-id={`task-detail-agent-ready-${task.ID}-row`}>
            <dt className="text-xs font-medium text-muted-foreground" data-test-id={`task-detail-agent-ready-${task.ID}-label`}>Agent 执行</dt>
            <dd data-test-id={`task-detail-agent-ready-${task.ID}-value`}>
              <Badge data-test-id={`task-detail-agent-ready-${task.ID}`} variant={task.AgentReady ? 'secondary' : 'outline'}>{task.AgentReady ? '可执行' : '不可执行'}</Badge>
            </dd>
          </div>
        </dl>
        <div className="grid gap-3" data-test-id={`task-detail-agent-work-${task.ID}`}>
          <h3 className="text-sm font-medium" data-test-id={`task-detail-agent-work-title-${task.ID}`}>Agent 执行记录</h3>
          <div className="grid gap-2" data-test-id={`task-detail-agent-run-list-${task.ID}`}>
            {agentWork.data?.Runs.length ? agentWork.data.Runs.map((run) => (
              <div className="rounded-md border px-3 py-2 text-sm" data-test-id={`task-detail-agent-run-${task.ID}-${run.ID}`} key={run.ID}>
                <p className="font-medium" data-test-id={`task-detail-agent-run-kind-${run.ID}`}>{run.WorkType}</p>
                <p className="text-muted-foreground" data-test-id={`task-detail-agent-run-owner-${run.ID}`}>{run.AgentOwnerUsername} / {run.AgentKeyName}</p>
                <p data-test-id={`task-detail-agent-run-result-${run.ID}`}>{run.Result}</p>
                {run.Passed == null ? null : <Badge data-test-id={`task-detail-agent-run-verdict-${run.ID}`} variant={run.Passed ? 'secondary' : 'outline'}>{run.Passed ? '审核通过' : '审核不通过'}</Badge>}
              </div>
            )) : <p className="text-sm text-muted-foreground" data-test-id={`task-detail-agent-run-empty-${task.ID}`}>暂无 Agent 执行记录</p>}
          </div>
          <div className="grid gap-2" data-test-id={`task-detail-human-review-list-${task.ID}`}>
            {agentWork.data?.HumanReviews.length ? agentWork.data.HumanReviews.map((review) => (
              <div className="rounded-md border px-3 py-2 text-sm" data-test-id={`task-detail-human-review-${task.ID}-${review.ID}`} key={review.ID}>
                <p className="font-medium" data-test-id={`task-detail-human-review-decision-${review.ID}`}>{review.Decision}</p>
                <p data-test-id={`task-detail-human-review-note-${review.ID}`}>{review.Note}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground" data-test-id={`task-detail-human-review-empty-${task.ID}`}>暂无人工审核记录</p>}
          </div>
        </div>
        <div className="grid gap-3" data-test-id={`task-detail-refs-${task.ID}`}>
          <h3 className="text-sm font-medium" data-test-id={`task-detail-refs-title-${task.ID}`}>引用任务</h3>
          <div className="flex gap-2" data-test-id={`task-detail-ref-controls-${task.ID}`}>
            <select className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" data-test-id={`task-detail-ref-select-${task.ID}`} onChange={(event) => setReferencedTaskID(event.target.value)} value={referencedTaskID}>
              <option data-test-id={`task-detail-ref-option-empty-${task.ID}`} value="">选择同项目任务</option>
              {candidates.map((candidate) => <option data-test-id={`task-detail-ref-option-${task.ID}-${candidate.ID}`} key={candidate.ID} value={candidate.ID}>{candidate.Title}</option>)}
            </select>
            <Button data-test-id={`task-detail-ref-add-${task.ID}`} disabled={!referencedTaskID || addRef.isPending} onClick={() => addRef.mutate()} type="button">添加引用</Button>
          </div>
          <div className="grid gap-2" data-test-id={`task-detail-ref-list-${task.ID}`}>
            {refs.data?.length ? refs.data.map((ref) => <div className="rounded-md border px-3 py-2 text-sm" data-test-id={`task-detail-ref-${task.ID}-${ref.ID}`} key={ref.ID}>{ref.Title}</div>) : <p className="text-sm text-muted-foreground" data-test-id={`task-detail-ref-empty-${task.ID}`}>暂无引用任务</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
