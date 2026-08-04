import { useEffect, useReducer, useState, type ComponentType, type CSSProperties, type SVGProps } from 'react'
import {
  BadgeCheck,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  GitBranch,
  MousePointer2,
  Pointer,
  RefreshCw,
  ScanSearch,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type AnimationPhase = 'idle' | 'executing' | 'awaiting' | 'confirming' | 'moving'
type ActivePhase = Exclude<AnimationPhase, 'idle' | 'moving'>
type Icon = ComponentType<SVGProps<SVGSVGElement>>
type StageMode = 'human' | 'agent' | 'hybrid'
type StageAccent = 'primary' | 'secondary' | 'warning' | 'success'
type ShowcaseTask = { id: string; title: string }
type BackgroundTask = ShowcaseTask & { status: string }
type WorkflowStage = {
  id: string
  title: string
  subtitle: string
  agentAction: string
  humanAction?: string
  mode: StageMode
  icon: Icon
  accent: StageAccent
  tasks: BackgroundTask[]
}
type PlaybackState =
  | { step: 'intro'; stageIndex: number }
  | { step: 'active'; stageIndex: number; phase: ActivePhase }
  | { step: 'handoff'; fromIndex: number; toIndex: number }
type PlaybackAction = { type: 'advance' }
type ShowcaseStyle = CSSProperties & Record<`--login-showcase-${string}`, string | number>

const DESKTOP_QUERY = '(min-width: 1024px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const ANIMATION_TIMING = {
  intro: 1500,
  executing: 2200,
  awaiting: 1400,
  confirming: 800,
  handoff: 1400,
} as const
const TASK_ICONS: Record<AnimationPhase, Icon> = {
  idle: Cpu,
  executing: Cpu,
  awaiting: UserCheck,
  confirming: CheckCircle2,
  moving: RefreshCw,
}

const stages: WorkflowStage[] = [
  {
    id: 'requirements',
    title: 'Requirement Clarification',
    subtitle: '需求澄清',
    agentAction: '正在提取目标、边界与验收条件',
    humanAction: '确认需求',
    mode: 'hybrid',
    icon: BrainCircuit,
    accent: 'primary',
    tasks: [
      { id: 'AK-795', title: '权限角色补充说明', status: '待确认' },
      { id: 'AK-788', title: '导入规则边界确认', status: '梳理中' },
      { id: 'AK-774', title: '异常通知口径统一', status: '待补充' },
      { id: 'AK-769', title: '成员邀请范围调整', status: '待确认' },
    ],
  },
  {
    id: 'breakdown',
    title: 'Technical Breakdown',
    subtitle: '技术拆解',
    agentAction: '正在生成实现步骤与任务依赖',
    mode: 'agent',
    icon: GitBranch,
    accent: 'secondary',
    tasks: [
      { id: 'AK-799', title: '通知中心重构', status: '拆解中' },
      { id: 'AK-784', title: 'API 限流策略升级', status: '待排期' },
      { id: 'AK-772', title: '任务依赖校验', status: '规划中' },
      { id: 'AK-765', title: '日志索引优化', status: '待拆解' },
    ],
  },
  {
    id: 'review',
    title: 'Code Review',
    subtitle: '代码审核',
    agentAction: '正在审查 diff、测试结果与风险',
    humanAction: '批准合并',
    mode: 'hybrid',
    icon: ScanSearch,
    accent: 'warning',
    tasks: [
      { id: 'AK-797', title: '看板筛选器优化', status: '审核中' },
      { id: 'AK-781', title: '审计日志导出', status: '待审核' },
      { id: 'AK-770', title: '任务批量编辑', status: '修改中' },
      { id: 'AK-761', title: '项目归档流程', status: '待审核' },
    ],
  },
  {
    id: 'qa',
    title: 'Test Acceptance',
    subtitle: '测试验收',
    agentAction: '正在执行回归并汇总验证证据',
    humanAction: '确认验收',
    mode: 'hybrid',
    icon: BadgeCheck,
    accent: 'success',
    tasks: [
      { id: 'AK-793', title: '成员邀请流程', status: '回归中' },
      { id: 'AK-776', title: '暗色模式适配', status: '待验收' },
      { id: 'AK-768', title: '移动端看板布局', status: '验证中' },
      { id: 'AK-757', title: '错误提示规范化', status: '待验收' },
    ],
  },
]

const demand: ShowcaseTask = { id: 'AK-802', title: '登录体验优化需求' }

function firstPhase(stage: WorkflowStage): ActivePhase {
  return stage.mode === 'human' ? 'awaiting' : 'executing'
}

function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  if (action.type !== 'advance') return state

  if (state.step === 'intro') {
    return { step: 'active', stageIndex: state.stageIndex, phase: firstPhase(stages[state.stageIndex]) }
  }

  if (state.step === 'handoff') {
    return { step: 'active', stageIndex: state.toIndex, phase: firstPhase(stages[state.toIndex]) }
  }

  const stage = stages[state.stageIndex]
  if (state.phase === 'executing') {
    return { ...state, phase: stage.humanAction ? 'awaiting' : 'confirming' }
  }
  if (state.phase === 'awaiting') {
    return { ...state, phase: 'confirming' }
  }

  return {
    step: 'handoff',
    fromIndex: state.stageIndex,
    toIndex: (state.stageIndex + 1) % stages.length,
  }
}

function playbackDuration(state: PlaybackState) {
  return state.step === 'active' ? ANIMATION_TIMING[state.phase] : ANIMATION_TIMING[state.step]
}

function stageDuration(stage: WorkflowStage) {
  const executionDuration = stage.mode === 'human' ? 0 : ANIMATION_TIMING.executing
  const reviewDuration = stage.humanAction ? ANIMATION_TIMING.awaiting : 0
  return executionDuration + reviewDuration + ANIMATION_TIMING.confirming
}

function currentSubstep(stage: WorkflowStage, phase: AnimationPhase) {
  if (phase === 'awaiting') return `等待人工确认：${stage.humanAction}`
  if (phase === 'confirming') return stage.humanAction ? '人工确认完成，正在记录结果' : 'Agent 已完成当前步骤'
  if (phase === 'moving') return '步骤结果已记录，正在进入下一步'
  return stage.agentAction
}

function circularStagePosition(index: number, activeIndex: number) {
  const forwardPosition = (index - activeIndex + stages.length) % stages.length
  return forwardPosition > stages.length / 2 ? forwardPosition - stages.length : forwardPosition
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

function useWorkflowPlayback(enabled: boolean) {
  const [playback, dispatch] = useReducer(playbackReducer, { step: 'intro', stageIndex: 0 })

  useEffect(() => {
    if (!enabled) return

    const timeout = window.setTimeout(() => dispatch({ type: 'advance' }), playbackDuration(playback))
    return () => window.clearTimeout(timeout)
  }, [enabled, playback])

  return playback
}

function accentClass(stage: WorkflowStage) {
  return `login-showcase-accent-${stage.accent}`
}

function AgentStatus({ stage }: { stage: WorkflowStage }) {
  return (
    <div
      className="login-showcase-activity-status login-showcase-agent-status"
      data-testid={`login-workflow-agent-status-${stage.id}`}
    >
      <Bot data-testid={`login-workflow-agent-icon-${stage.id}`} />
      <div className="login-showcase-agent-signals" data-testid={`login-workflow-agent-signals-${stage.id}`}>
        <i data-testid={`login-workflow-agent-signal-${stage.id}-1`} />
        <i data-testid={`login-workflow-agent-signal-${stage.id}-2`} />
        <i data-testid={`login-workflow-agent-signal-${stage.id}-3`} />
      </div>
    </div>
  )
}

function HumanStatus({ confirming, stage }: { confirming: boolean; stage: WorkflowStage }) {
  const PointerIcon = confirming ? Pointer : MousePointer2

  return (
    <div
      className={cn('login-showcase-activity-status', 'login-showcase-human-status', confirming && 'login-showcase-human-status-confirmed')}
      data-testid={`login-workflow-human-status-${stage.id}`}
    >
      <Button
        className="login-showcase-confirm-button"
        data-testid={`login-workflow-confirm-button-${stage.id}`}
        size="sm"
        tabIndex={-1}
        type="button"
      >
        {confirming && <CheckCircle2 data-testid={`login-workflow-confirm-check-${stage.id}`} />}
        <span data-testid={`login-workflow-confirm-button-label-${stage.id}`}>{confirming ? '已确认' : stage.humanAction}</span>
      </Button>
      <PointerIcon className="login-showcase-confirm-pointer" data-testid={`login-workflow-confirm-pointer-${stage.id}`} />
    </div>
  )
}

function CompletionStatus({ moving, stage }: { moving: boolean; stage: WorkflowStage }) {
  const StatusIcon = moving ? RefreshCw : CheckCircle2
  const state = moving ? 'moving' : 'complete'

  return (
    <div
      className={cn('login-showcase-activity-status', `login-showcase-${state}-status`)}
      data-testid={`login-workflow-${state}-status-${stage.id}`}
    >
      <StatusIcon data-testid={`login-workflow-${state}-icon-${stage.id}`} />
      <span data-testid={`login-workflow-${state}-label-${stage.id}`}>{moving ? '下一步' : '已完成'}</span>
    </div>
  )
}

function FeaturedTask({
  isIntro,
  isRestart,
  phase,
  stage,
  stageIndex,
}: {
  isIntro: boolean
  isRestart: boolean
  phase: AnimationPhase
  stage: WorkflowStage
  stageIndex: number
}) {
  const TaskIcon = TASK_ICONS[phase]
  const showsHumanConfirmation = Boolean(stage.humanAction) && (phase === 'awaiting' || phase === 'confirming')
  const showsAgentExecution = phase === 'idle' || phase === 'executing'
  const progressStyle: ShowcaseStyle = {
    '--login-showcase-progress-start': stageIndex / stages.length,
    '--login-showcase-progress-end': (stageIndex + 1) / stages.length,
    '--login-showcase-progress-duration': `${stageDuration(stage)}ms`,
  }

  return (
    <div
      className={cn(
        'login-showcase-task',
        'login-showcase-task-active',
        'login-showcase-task-floating',
        phase === 'moving' && 'login-showcase-task-handoff login-showcase-task-compact',
        isIntro && 'login-showcase-task-intro',
        isRestart && 'login-showcase-task-restart',
        `login-showcase-task-${phase}`,
      )}
      data-testid={`login-workflow-task-${stage.id}-${demand.id}`}
    >
      <div className="login-showcase-task-compact-content" data-testid={`login-workflow-task-compact-content-${stage.id}-${demand.id}`}>
        <div className="login-showcase-background-task-meta" data-testid={`login-workflow-task-compact-meta-${stage.id}-${demand.id}`}>
          <span data-testid={`login-workflow-task-compact-id-${stage.id}-${demand.id}`}>{demand.id}</span>
          <span data-testid={`login-workflow-task-compact-status-${stage.id}-${demand.id}`}>流转中</span>
        </div>
        <p data-testid={`login-workflow-task-compact-title-${stage.id}-${demand.id}`}>{demand.title}</p>
      </div>
      <div className="login-showcase-task-expanded-content" data-testid={`login-workflow-task-expanded-content-${stage.id}-${demand.id}`}>
        <div className="login-showcase-task-row" data-testid={`login-workflow-task-row-${stage.id}-${demand.id}`}>
          <span className="login-showcase-task-label" data-testid={`login-workflow-task-label-${stage.id}-${demand.id}`}>{demand.id}</span>
          <TaskIcon className={cn('login-showcase-task-icon', accentClass(stage))} data-testid={`login-workflow-task-icon-${stage.id}-${demand.id}`} />
        </div>
        <p className="login-showcase-task-title" data-testid={`login-workflow-task-title-${stage.id}-${demand.id}`}>{demand.title}</p>
        <div className="login-showcase-action-scene" data-testid={`login-workflow-action-scene-${stage.id}`}>
          <div className="login-showcase-activity-main" data-testid={`login-workflow-activity-main-${stage.id}`}>
            <p className="login-showcase-substep" data-testid={`login-workflow-substep-${stage.id}`}>{currentSubstep(stage, phase)}</p>
            <div className="login-showcase-progress" data-testid={`login-workflow-progress-${stage.id}-${demand.id}`}>
              <div
                className={cn('login-showcase-progress-fill', phase === 'moving' || isIntro ? 'login-showcase-progress-paused' : undefined, accentClass(stage))}
                data-testid={`login-workflow-progress-fill-${stage.id}-${demand.id}`}
                key={stage.id}
                style={progressStyle}
              />
              {showsAgentExecution && <div className="login-showcase-progress-scan" data-testid={`login-workflow-progress-scan-${stage.id}`} />}
            </div>
          </div>
          {showsAgentExecution && <AgentStatus stage={stage} />}
          {showsHumanConfirmation && <HumanStatus confirming={phase === 'confirming'} stage={stage} />}
          {phase === 'confirming' && !stage.humanAction && <CompletionStatus moving={false} stage={stage} />}
          {phase === 'moving' && <CompletionStatus moving stage={stage} />}
        </div>
      </div>
    </div>
  )
}

function StageCard({ activeIndex, dropSlotIndex, isHandoff, stage, stageIndex }: {
  activeIndex: number
  dropSlotIndex: number
  isHandoff: boolean
  stage: WorkflowStage
  stageIndex: number
}) {
  const StageIcon = stage.icon
  const position = circularStagePosition(stageIndex, activeIndex)
  const distance = Math.abs(position)
  const style: ShowcaseStyle = {
    '--login-showcase-stage-position': position,
    '--login-showcase-stage-distance': distance,
  }

  return (
    <Card
      className={cn('login-showcase-stage', position === 0 && 'login-showcase-stage-active')}
      data-position={position}
      data-testid={`login-workflow-stage-${stage.id}`}
      style={style}
    >
      <div className="login-showcase-stage-header" data-testid={`login-workflow-stage-header-${stage.id}`}>
        <StageIcon className={cn('login-showcase-stage-icon', accentClass(stage))} data-testid={`login-workflow-stage-icon-${stage.id}`} />
        <div data-testid={`login-workflow-stage-copy-${stage.id}`}>
          <p className="login-showcase-stage-subtitle" data-testid={`login-workflow-stage-subtitle-${stage.id}`}>{stage.subtitle}</p>
          <h3 className="login-showcase-stage-title" data-testid={`login-workflow-stage-title-${stage.id}`}>{stage.title}</h3>
        </div>
      </div>
      <div className="login-showcase-task-list" data-testid={`login-workflow-task-list-${stage.id}`}>
        <div
          className={cn(
            'login-showcase-drop-slot',
            stageIndex === dropSlotIndex && (isHandoff ? 'login-showcase-drop-slot-compact' : 'login-showcase-drop-slot-open'),
          )}
          data-testid={`login-workflow-drop-slot-${stage.id}`}
        />
        {stage.tasks.map((task) => (
          <div className="login-showcase-background-task" data-testid={`login-workflow-background-task-${stage.id}-${task.id}`} key={task.id}>
            <div className="login-showcase-background-task-meta" data-testid={`login-workflow-background-task-meta-${stage.id}-${task.id}`}>
              <span data-testid={`login-workflow-background-task-id-${stage.id}-${task.id}`}>{task.id}</span>
              <span data-testid={`login-workflow-background-task-status-${stage.id}-${task.id}`}>{task.status}</span>
            </div>
            <p data-testid={`login-workflow-background-task-title-${stage.id}-${task.id}`}>{task.title}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function LoginWorkflowShowcase() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const reduceMotion = useMediaQuery(REDUCED_MOTION_QUERY)
  const playback = useWorkflowPlayback(isDesktop && !reduceMotion)

  if (!isDesktop) return null

  const isHandoff = playback.step === 'handoff'
  const isIntro = playback.step === 'intro' && !reduceMotion
  const activeIndex = isHandoff ? playback.toIndex : playback.stageIndex
  const taskStageIndex = isHandoff ? playback.fromIndex : playback.stageIndex
  const taskStage = stages[taskStageIndex]
  const taskPhase: AnimationPhase = reduceMotion ? 'idle' : isHandoff ? 'moving' : playback.step === 'active' ? playback.phase : firstPhase(taskStage)
  const isCycleRestart = isHandoff && playback.toIndex === 0
  const rootStyle: ShowcaseStyle = {
    '--login-showcase-intro-duration': `${ANIMATION_TIMING.intro}ms`,
    '--login-showcase-handoff-duration': `${ANIMATION_TIMING.handoff}ms`,
  }

  return (
    <section
      aria-hidden="true"
      className={cn('login-showcase', reduceMotion && 'login-showcase-static')}
      data-testid="login-workflow-showcase"
      data-reduced-motion={reduceMotion ? 'true' : 'false'}
      style={rootStyle}
    >
      <div className="login-showcase-grid" data-testid="login-workflow-grid" />
      <div className="login-showcase-glow" data-testid="login-workflow-glow" />
      <div className="login-showcase-copy" data-testid="login-workflow-copy">
        <p className="login-showcase-eyebrow" data-testid="login-workflow-eyebrow">AGENTIC DELIVERY SYSTEM</p>
        <h2 className="login-showcase-heading whitespace-nowrap" data-testid="login-workflow-heading">面向 Agentic Coding 团队的交付管理系统</h2>
        <p className="login-showcase-description whitespace-nowrap" data-testid="login-workflow-description">以看板为协作中心，任务需求在 Agent 智能体与人类工程师之间自由流转。</p>
      </div>
      <div
        className={cn(
          'login-showcase-carousel',
          isIntro && 'login-showcase-carousel-intro',
          isCycleRestart && 'login-showcase-carousel-restarting',
        )}
        data-testid="login-workflow-carousel"
      >
        <FeaturedTask
          isIntro={isIntro}
          isRestart={isCycleRestart}
          phase={taskPhase}
          stage={taskStage}
          stageIndex={taskStageIndex}
        />
        {stages.map((stage, stageIndex) => (
          <StageCard
            activeIndex={activeIndex}
            dropSlotIndex={isHandoff ? playback.toIndex : activeIndex}
            isHandoff={isHandoff}
            key={stage.id}
            stage={stage}
            stageIndex={stageIndex}
          />
        ))}
      </div>
    </section>
  )
}
