import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Task } from '@/types'

function DetailRow({ label, testID, value }: { label: string; testID: string; value: string }) {
  return (
    <div className="grid gap-1" data-test-id={`${testID}-row`}>
      <dt className="text-xs font-medium text-muted-foreground" data-test-id={`${testID}-label`}>{label}</dt>
      <dd className="text-sm" data-test-id={`${testID}-value`}>{value}</dd>
    </div>
  )
}

export function TaskDetailDialog({ onOpenChange, open, task }: { onOpenChange: (open: boolean) => void; open: boolean; task: Task }) {
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
          <DetailRow label="锁定状态" testID={`task-detail-locked-${task.ID}`} value={task.Locked ? '已锁定' : '未锁定'} />
          <div className="grid gap-1" data-test-id={`task-detail-agent-ready-${task.ID}-row`}>
            <dt className="text-xs font-medium text-muted-foreground" data-test-id={`task-detail-agent-ready-${task.ID}-label`}>Agent 执行</dt>
            <dd data-test-id={`task-detail-agent-ready-${task.ID}-value`}>
              <Badge data-test-id={`task-detail-agent-ready-${task.ID}`} variant={task.AgentReady ? 'secondary' : 'outline'}>{task.AgentReady ? '可执行' : '不可执行'}</Badge>
            </dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  )
}
