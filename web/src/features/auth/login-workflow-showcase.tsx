import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import { BadgeCheck, BrainCircuit, CheckCircle2, Cpu, GitBranch, RefreshCw, ScanSearch, UserCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type AnimationPhase = 'idle' | 'scanning' | 'verifying' | 'moving'
type Icon = ComponentType<SVGProps<SVGSVGElement>>
type StageMode = 'human' | 'agent' | 'hybrid'
type ShowcaseTask = { id: string; title: string }
type Handoff = { from: number; to: number } | null
type WorkflowStage = {
  id: string
  title: string
  subtitle: string
  owner: string
  gate: string
  detail: string
  mode: StageMode
  icon: Icon
  accent: string
}

const desktopQuery = '(min-width: 1024px)'
const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

const stages: WorkflowStage[] = [
  {
    id: 'requirements',
    title: 'Requirement Clarification',
    subtitle: '需求澄清',
    owner: '人工明确需求',
    gate: 'Agentic Ready',
    detail: '明确范围、验收口径和参考上下文',
    mode: 'human',
    icon: BrainCircuit,
    accent: 'login-showcase-accent-primary',
  },
  {
    id: 'breakdown',
    title: 'Technical Breakdown',
    subtitle: '技术拆解',
    owner: 'Agent 拆解并等待审核',
    gate: 'Pending Human Review',
    detail: '输出实现计划，人工通过后开放开发',
    mode: 'hybrid',
    icon: GitBranch,
    accent: 'login-showcase-accent-secondary',
  },
  {
    id: 'review',
    title: 'Code Review',
    subtitle: '代码审核',
    owner: 'Agent 审核，人工确认',
    gate: 'Commit SHA Linked',
    detail: '开发结果绑定已同步 Commit SHA',
    mode: 'agent',
    icon: ScanSearch,
    accent: 'login-showcase-accent-warning',
  },
  {
    id: 'qa',
    title: 'Test Acceptance',
    subtitle: '测试验收',
    owner: '人工验证并归档',
    gate: 'Done / Need Redo',
    detail: '通过后完成，失败则回到技术拆解补充上下文',
    mode: 'human',
    icon: BadgeCheck,
    accent: 'login-showcase-accent-success',
  },
]

const demand: ShowcaseTask = { id: 'AK-802', title: '登录体验优化需求' }

const phaseCopy: Record<StageMode, Record<AnimationPhase, string>> = {
  human: {
    idle: 'HUMAN GATE',
    scanning: 'HUMAN CHECK',
    verifying: 'CONFIRMED',
    moving: 'HANDOFF',
  },
  agent: {
    idle: 'AGENT READY',
    scanning: 'AGENT RUN',
    verifying: 'REVIEWED',
    moving: 'HANDOFF',
  },
  hybrid: {
    idle: 'AGENT READY',
    scanning: 'AGENT RUN',
    verifying: 'HUMAN REVIEW',
    moving: 'HANDOFF',
  },
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

function stageStateClass(index: number, activeIndex: number) {
  const offset = (index - activeIndex + stages.length) % stages.length
  return ['login-showcase-stage-active', 'login-showcase-stage-next-1', 'login-showcase-stage-next-2', 'login-showcase-stage-prev-1'][offset]
}

export function LoginWorkflowShowcase() {
  const isDesktop = useMediaQuery(desktopQuery)
  const reduceMotion = useMediaQuery(reducedMotionQuery)
  const [activeIndex, setActiveIndex] = useState(0)
  const [phase, setPhase] = useState<AnimationPhase>('scanning')
  const [handoff, setHandoff] = useState<Handoff>(null)
  const [isIntro, setIsIntro] = useState(true)

  useEffect(() => {
    if (!isDesktop || reduceMotion || !isIntro) return

    const timeout = window.setTimeout(() => setIsIntro(false), 1500)
    return () => window.clearTimeout(timeout)
  }, [isDesktop, isIntro, reduceMotion])

  useEffect(() => {
    if (!isDesktop || reduceMotion || isIntro) return

    const timeout = window.setTimeout(() => {
      if (handoff) {
        if (handoff.to === 0) setActiveIndex(0)
        setHandoff(null)
        setPhase('scanning')
        return
      }

      if (phase === 'scanning') {
        setPhase('verifying')
        return
      }
      if (phase === 'verifying') {
        const nextIndex = (activeIndex + 1) % stages.length
        setHandoff({ from: activeIndex, to: nextIndex })
        if (nextIndex !== 0) setActiveIndex(nextIndex)
        setPhase('moving')
        return
      }
    }, handoff ? 1500 : phase === 'scanning' ? 2000 : phase === 'verifying' ? 1000 : 1500)

    return () => window.clearTimeout(timeout)
  }, [activeIndex, handoff, isDesktop, isIntro, phase, reduceMotion])

  if (!isDesktop) return null

  const taskStageIndex = handoff?.from ?? activeIndex
  const taskStage = stages[taskStageIndex]
  const taskPhase = reduceMotion ? 'idle' : phase
  const isCycleRestart = handoff?.to === 0
  const TaskIcon = taskPhase === 'verifying'
    ? CheckCircle2
    : taskPhase === 'scanning'
      ? (taskStage.mode === 'human' ? UserCheck : Cpu)
      : RefreshCw

  return (
    <section
      aria-hidden="true"
      className={cn('login-showcase', reduceMotion && 'login-showcase-static')}
      data-testid="login-workflow-showcase"
      data-reduced-motion={reduceMotion ? 'true' : 'false'}
    >
      <div className="login-showcase-grid" data-testid="login-workflow-grid" />
      <div className="login-showcase-glow" data-testid="login-workflow-glow" />
      <div className="login-showcase-copy" data-testid="login-workflow-copy">
        <p className="login-showcase-eyebrow" data-testid="login-workflow-eyebrow">AGENTIC DELIVERY SYSTEM</p>
        <h2 className="login-showcase-heading" data-testid="login-workflow-heading">一个需求的完整交付生命线</h2>
        <p className="login-showcase-description" data-testid="login-workflow-description">从人工澄清到 Agent 拆解、提交审核、人工测试，同一张需求卡持续流转并保留每个关口状态。</p>
      </div>
      <div
        className={cn(
          'login-showcase-carousel',
          isIntro && !reduceMotion && 'login-showcase-carousel-intro',
          isCycleRestart && 'login-showcase-carousel-restarting',
        )}
        data-testid="login-workflow-carousel"
      >
        <div
          className={cn(
            'login-showcase-task',
            'login-showcase-task-active',
            'login-showcase-task-floating',
            handoff && 'login-showcase-task-handoff',
            isIntro && !reduceMotion && 'login-showcase-task-intro',
            isCycleRestart && 'login-showcase-task-restart',
            `login-showcase-task-${taskPhase}`,
          )}
          data-testid={`login-workflow-task-${taskStage.id}-${demand.id}`}
        >
          <div className="login-showcase-task-row" data-testid={`login-workflow-task-row-${taskStage.id}-${demand.id}`}>
            <span className="login-showcase-task-label" data-testid={`login-workflow-task-label-${taskStage.id}-${demand.id}`}>{demand.id}</span>
            <TaskIcon className={cn('login-showcase-task-icon', taskStage.accent)} data-testid={`login-workflow-task-icon-${taskStage.id}-${demand.id}`} />
          </div>
          <p className="login-showcase-task-title" data-testid={`login-workflow-task-title-${taskStage.id}-${demand.id}`}>{demand.title}</p>
          <p className="login-showcase-task-detail" data-testid={`login-workflow-task-detail-${taskStage.id}-${demand.id}`}>{taskStage.detail}</p>
          <div className="login-showcase-progress-row" data-testid={`login-workflow-progress-row-${taskStage.id}-${demand.id}`}>
            <div className="login-showcase-progress" data-testid={`login-workflow-progress-${taskStage.id}-${demand.id}`}>
              <div
                className={cn(
                  'login-showcase-progress-fill',
                  `login-showcase-progress-stage-${taskStageIndex}`,
                  (handoff || isIntro) && 'login-showcase-progress-paused',
                  taskStage.accent,
                )}
                data-testid={`login-workflow-progress-fill-${taskStage.id}-${demand.id}`}
              />
            </div>
            <span className="login-showcase-agent" data-testid={`login-workflow-agent-${taskStage.id}-${demand.id}`}>{phaseCopy[taskStage.mode][taskPhase]}</span>
          </div>
          <span className="login-showcase-task-status" data-testid={`login-workflow-task-status-${taskStage.id}-${demand.id}`}>{taskStage.gate}</span>
          <span className="login-showcase-code-stream" data-testid={`login-workflow-code-${taskStage.id}-${demand.id}`}>{taskStage.mode === 'human' ? 'manual confirmation' : 'commit sha verified'}</span>
        </div>
        {stages.map((stage, stageIndex) => {
          const StageIcon = stage.icon
          return (
            <Card
              className={cn('login-showcase-stage', stageStateClass(stageIndex, activeIndex))}
              data-testid={`login-workflow-stage-${stage.id}`}
              key={stage.id}
            >
              <div className="login-showcase-stage-header" data-testid={`login-workflow-stage-header-${stage.id}`}>
                <StageIcon className={cn('login-showcase-stage-icon', stage.accent)} data-testid={`login-workflow-stage-icon-${stage.id}`} />
                <div data-testid={`login-workflow-stage-copy-${stage.id}`}>
                  <p className="login-showcase-stage-subtitle" data-testid={`login-workflow-stage-subtitle-${stage.id}`}>{stage.subtitle}</p>
                  <h3 className="login-showcase-stage-title" data-testid={`login-workflow-stage-title-${stage.id}`}>{stage.title}</h3>
                </div>
              </div>
              <div className="login-showcase-stage-meta" data-testid={`login-workflow-stage-meta-${stage.id}`}>
                <span data-testid={`login-workflow-stage-owner-${stage.id}`}>{stage.owner}</span>
                <span className="login-showcase-stage-gate" data-testid={`login-workflow-stage-gate-${stage.id}`}>{stage.gate}</span>
              </div>
              <div className="login-showcase-task-list" data-testid={`login-workflow-task-list-${stage.id}`} />
            </Card>
          )
        })}
      </div>
    </section>
  )
}
