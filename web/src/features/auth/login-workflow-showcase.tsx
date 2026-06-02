import { useEffect, useState, type ComponentType, type CSSProperties, type SVGProps } from 'react'
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

const progressByPhase: Record<AnimationPhase, number> = {
  idle: 0.1,
  scanning: 0.38,
  verifying: 0.7,
  moving: 0.95,
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
  const [phase, setPhase] = useState<AnimationPhase>('idle')
  const [handoff, setHandoff] = useState<Handoff>(null)

  useEffect(() => {
    if (!isDesktop || reduceMotion) return

    const timeout = window.setTimeout(() => {
      if (handoff) {
        setHandoff(null)
        setPhase('idle')
        return
      }

      if (phase === 'idle') {
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
        setActiveIndex(nextIndex)
        setPhase('moving')
        return
      }
    }, handoff ? 1500 : phase === 'idle' ? 1200 : phase === 'scanning' ? 2000 : phase === 'verifying' ? 1000 : 1500)

    return () => window.clearTimeout(timeout)
  }, [activeIndex, handoff, isDesktop, phase, reduceMotion])

  if (!isDesktop) return null

  return (
    <section
      aria-hidden="true"
      className={cn('login-showcase', reduceMotion && 'login-showcase-static')}
      data-test-id="login-workflow-showcase"
      data-reduced-motion={reduceMotion ? 'true' : 'false'}
    >
      <div className="login-showcase-grid" data-test-id="login-workflow-grid" />
      <div className="login-showcase-glow" data-test-id="login-workflow-glow" />
      <div className="login-showcase-copy" data-test-id="login-workflow-copy">
        <p className="login-showcase-eyebrow" data-test-id="login-workflow-eyebrow">AGENTIC DELIVERY SYSTEM</p>
        <h2 className="login-showcase-heading" data-test-id="login-workflow-heading">一个需求的完整交付生命线</h2>
        <p className="login-showcase-description" data-test-id="login-workflow-description">从人工澄清到 Agent 拆解、提交审核、人工测试，同一张需求卡持续流转并保留每个关口状态。</p>
      </div>
      <div className="login-showcase-carousel" data-test-id="login-workflow-carousel">
        {handoff ? (
          <div
            className="login-showcase-task login-showcase-task-active login-showcase-task-handoff"
            data-test-id={`login-workflow-task-handoff-${demand.id}`}
          >
            <div className="login-showcase-task-row" data-test-id={`login-workflow-task-row-handoff-${demand.id}`}>
              <span className="login-showcase-task-label" data-test-id={`login-workflow-task-label-handoff-${demand.id}`}>{demand.id}</span>
              <RefreshCw className={cn('login-showcase-task-icon', stages[handoff.to].accent)} data-test-id={`login-workflow-task-icon-handoff-${demand.id}`} />
            </div>
            <p className="login-showcase-task-title" data-test-id={`login-workflow-task-title-handoff-${demand.id}`}>{demand.title}</p>
            <p className="login-showcase-task-detail" data-test-id={`login-workflow-task-detail-handoff-${demand.id}`}>{stages[handoff.to].detail}</p>
            <div className="login-showcase-progress-row" data-test-id={`login-workflow-progress-row-handoff-${demand.id}`}>
              <div className="login-showcase-progress" data-test-id={`login-workflow-progress-handoff-${demand.id}`}>
                <div
                  className={cn('login-showcase-progress-fill login-showcase-progress-fill-handoff', stages[handoff.to].accent)}
                  data-test-id={`login-workflow-progress-fill-handoff-${demand.id}`}
                  style={{ '--handoff-progress-start': '100%', '--handoff-progress-end': `${progressByPhase.idle * 100}%` } as CSSProperties}
                />
              </div>
              <span className="login-showcase-agent" data-test-id={`login-workflow-agent-handoff-${demand.id}`}>HANDOFF</span>
            </div>
            <span className="login-showcase-task-status" data-test-id={`login-workflow-task-status-handoff-${demand.id}`}>{stages[handoff.to].gate}</span>
          </div>
        ) : null}
        {stages.map((stage, stageIndex) => {
          const StageIcon = stage.icon
          const isActive = stageIndex === activeIndex && !handoff
          const isHandoffSource = handoff?.from === stageIndex
          const taskPhase = isHandoffSource ? 'moving' : isActive ? phase : 'idle'
          const TaskIcon = taskPhase === 'verifying' ? CheckCircle2 : taskPhase === 'scanning' ? (stage.mode === 'human' ? UserCheck : Cpu) : RefreshCw
          return (
            <Card
              className={cn('login-showcase-stage', stageStateClass(stageIndex, activeIndex))}
              data-test-id={`login-workflow-stage-${stage.id}`}
              key={stage.id}
            >
              <div className="login-showcase-stage-header" data-test-id={`login-workflow-stage-header-${stage.id}`}>
                <StageIcon className={cn('login-showcase-stage-icon', stage.accent)} data-test-id={`login-workflow-stage-icon-${stage.id}`} />
                <div data-test-id={`login-workflow-stage-copy-${stage.id}`}>
                  <p className="login-showcase-stage-subtitle" data-test-id={`login-workflow-stage-subtitle-${stage.id}`}>{stage.subtitle}</p>
                  <h3 className="login-showcase-stage-title" data-test-id={`login-workflow-stage-title-${stage.id}`}>{stage.title}</h3>
                </div>
              </div>
              <div className="login-showcase-stage-meta" data-test-id={`login-workflow-stage-meta-${stage.id}`}>
                <span data-test-id={`login-workflow-stage-owner-${stage.id}`}>{stage.owner}</span>
                <span className="login-showcase-stage-gate" data-test-id={`login-workflow-stage-gate-${stage.id}`}>{stage.gate}</span>
              </div>
              <div className="login-showcase-task-list" data-test-id={`login-workflow-task-list-${stage.id}`}>
                {isActive || isHandoffSource ? (
                  <div
                    className={cn('login-showcase-task', 'login-showcase-task-active', isHandoffSource && 'login-showcase-task-ghost', `login-showcase-task-${taskPhase}`)}
                    data-test-id={`login-workflow-task-${stage.id}-${demand.id}`}
                  >
                    <div className="login-showcase-task-row" data-test-id={`login-workflow-task-row-${stage.id}-${demand.id}`}>
                      <span className="login-showcase-task-label" data-test-id={`login-workflow-task-label-${stage.id}-${demand.id}`}>{demand.id}</span>
                      <TaskIcon className={cn('login-showcase-task-icon', stage.accent)} data-test-id={`login-workflow-task-icon-${stage.id}-${demand.id}`} />
                    </div>
                    <p className="login-showcase-task-title" data-test-id={`login-workflow-task-title-${stage.id}-${demand.id}`}>{demand.title}</p>
                    <p className="login-showcase-task-detail" data-test-id={`login-workflow-task-detail-${stage.id}-${demand.id}`}>{stage.detail}</p>
                    <div className="login-showcase-progress-row" data-test-id={`login-workflow-progress-row-${stage.id}-${demand.id}`}>
                      <div className="login-showcase-progress" data-test-id={`login-workflow-progress-${stage.id}-${demand.id}`}>
                        <div
                          className={cn('login-showcase-progress-fill', stage.accent)}
                          data-test-id={`login-workflow-progress-fill-${stage.id}-${demand.id}`}
                          style={{ width: `${progressByPhase[taskPhase] * 100}%` }}
                        />
                      </div>
                      <span className="login-showcase-agent" data-test-id={`login-workflow-agent-${stage.id}-${demand.id}`}>{phaseCopy[stage.mode][taskPhase]}</span>
                    </div>
                    <span className="login-showcase-task-status" data-test-id={`login-workflow-task-status-${stage.id}-${demand.id}`}>{stage.gate}</span>
                    <span className="login-showcase-code-stream" data-test-id={`login-workflow-code-${stage.id}-${demand.id}`}>{stage.mode === 'human' ? 'manual confirmation' : 'commit sha verified'}</span>
                  </div>
                ) : (
                  <div className="login-showcase-placeholder" data-test-id={`login-workflow-placeholder-${stage.id}`}>
                    <span data-test-id={`login-workflow-placeholder-text-${stage.id}`}>等待需求流入</span>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
