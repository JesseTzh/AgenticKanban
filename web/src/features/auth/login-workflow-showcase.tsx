import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import { BadgeCheck, BrainCircuit, CheckCircle2, Cpu, GitBranch, RefreshCw, ScanSearch, Terminal } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type AnimationPhase = 'idle' | 'scanning' | 'verifying' | 'moving'
type Icon = ComponentType<SVGProps<SVGSVGElement>>
type ShowcaseTask = { id: string; progress: number }
type WorkflowStage = {
  id: string
  title: string
  subtitle: string
  icon: Icon
  accent: string
}

const desktopQuery = '(min-width: 1024px)'
const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

const stages: WorkflowStage[] = [
  { id: 'requirements', title: 'Requirement Refinement', subtitle: '需求澄清', icon: BrainCircuit, accent: 'login-showcase-accent-primary' },
  { id: 'breakdown', title: 'Technical Breakdown', subtitle: '技术拆解', icon: GitBranch, accent: 'login-showcase-accent-secondary' },
  { id: 'implementation', title: 'Implementation', subtitle: '开发执行', icon: Terminal, accent: 'login-showcase-accent-primary' },
  { id: 'review', title: 'Code Review', subtitle: '代码复核', icon: ScanSearch, accent: 'login-showcase-accent-warning' },
  { id: 'qa', title: 'QA Validation', subtitle: '测试验收', icon: BadgeCheck, accent: 'login-showcase-accent-success' },
]

const initialTasks: ShowcaseTask[][] = [
  [{ id: 'AK-801: Database Schema Spec', progress: 42 }, { id: 'AK-802: Edge Case Analysis', progress: 68 }],
  [{ id: 'AK-914: API Protocol Mapping', progress: 54 }],
  [],
  [],
  [],
]

const incomingTasks = [
  'AK-803: Permission Boundary',
  'AK-804: Event Contract Review',
  'AK-805: Retry Policy Matrix',
]

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

function positionClass(index: number, activeIndex: number) {
  const offset = (index - activeIndex + stages.length) % stages.length
  return ['login-showcase-stage-active', 'login-showcase-stage-next-1', 'login-showcase-stage-next-2', 'login-showcase-stage-prev-2', 'login-showcase-stage-prev-1'][offset]
}

export function LoginWorkflowShowcase() {
  const isDesktop = useMediaQuery(desktopQuery)
  const reduceMotion = useMediaQuery(reducedMotionQuery)
  const [tasksByStage, setTasksByStage] = useState(initialTasks)
  const [activeIndex, setActiveIndex] = useState(0)
  const [phase, setPhase] = useState<AnimationPhase>('idle')
  const [incomingIndex, setIncomingIndex] = useState(0)
  const activeTask = tasksByStage[activeIndex][tasksByStage[activeIndex].length - 1]

  useEffect(() => {
    if (!isDesktop || reduceMotion) return

    const timeout = window.setTimeout(() => {
      if (!activeTask) {
        setActiveIndex((current) => (current + 1) % stages.length)
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
        setPhase('moving')
        return
      }

      const nextIndex = (activeIndex + 1) % stages.length
      setTasksByStage((current) => {
        const next = current.map((tasks) => [...tasks])
        next[activeIndex] = next[activeIndex].filter((task) => task.id !== activeTask.id)
        if (activeIndex < stages.length - 1) next[nextIndex] = [{ ...activeTask, progress: 34 }, ...next[nextIndex]].slice(0, 3)
        if (nextIndex === 0 && next[0].length < 3) {
          next[0] = [{ id: incomingTasks[incomingIndex], progress: 28 }, ...next[0]]
        }
        return next
      })
      if (nextIndex === 0) setIncomingIndex((current) => (current + 1) % incomingTasks.length)
      setActiveIndex(nextIndex)
      setPhase('idle')
    }, phase === 'idle' ? 1200 : phase === 'scanning' ? 2000 : phase === 'verifying' ? 1000 : 1500)

    return () => window.clearTimeout(timeout)
  }, [activeIndex, activeTask, incomingIndex, isDesktop, phase, reduceMotion])

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
        <h2 className="login-showcase-heading" data-test-id="login-workflow-heading">Agentic Coding 时代的项目管理系统</h2>
        <p className="login-showcase-description" data-test-id="login-workflow-description">自动执行与人工复核协同流转，保持每个交付阶段清晰可见。</p>
      </div>
      <div className="login-showcase-carousel" data-test-id="login-workflow-carousel">
        {stages.map((stage, stageIndex) => {
          const StageIcon = stage.icon
          return (
            <Card
              className={cn('login-showcase-stage', positionClass(stageIndex, activeIndex))}
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
              <div className="login-showcase-task-list" data-test-id={`login-workflow-task-list-${stage.id}`}>
                {tasksByStage[stageIndex].map((task) => {
                  const isActive = stageIndex === activeIndex && task.id === activeTask?.id
                  const taskPhase = isActive ? phase : 'idle'
                  const TaskIcon = taskPhase === 'verifying' ? CheckCircle2 : taskPhase === 'scanning' ? Cpu : RefreshCw
                  return (
                    <div
                      className={cn('login-showcase-task', isActive && 'login-showcase-task-active', `login-showcase-task-${taskPhase}`)}
                      data-test-id={`login-workflow-task-${stage.id}-${task.id.slice(0, 6)}`}
                      key={task.id}
                    >
                      <div className="login-showcase-task-row" data-test-id={`login-workflow-task-row-${stage.id}-${task.id.slice(0, 6)}`}>
                        <span className="login-showcase-task-label" data-test-id={`login-workflow-task-label-${stage.id}-${task.id.slice(0, 6)}`}>{task.id}</span>
                        <TaskIcon className={cn('login-showcase-task-icon', stage.accent)} data-test-id={`login-workflow-task-icon-${stage.id}-${task.id.slice(0, 6)}`} />
                      </div>
                      <div className="login-showcase-progress-row" data-test-id={`login-workflow-progress-row-${stage.id}-${task.id.slice(0, 6)}`}>
                        <div className="login-showcase-progress" data-test-id={`login-workflow-progress-${stage.id}-${task.id.slice(0, 6)}`}>
                          <div
                            className={cn('login-showcase-progress-fill', stage.accent)}
                            data-test-id={`login-workflow-progress-fill-${stage.id}-${task.id.slice(0, 6)}`}
                            style={{ width: `${taskPhase === 'scanning' || taskPhase === 'verifying' || taskPhase === 'moving' ? 100 : task.progress}%` }}
                          />
                        </div>
                        <span className="login-showcase-agent" data-test-id={`login-workflow-agent-${stage.id}-${task.id.slice(0, 6)}`}>AI AGENT</span>
                      </div>
                      <span className="login-showcase-code-stream" data-test-id={`login-workflow-code-${stage.id}-${task.id.slice(0, 6)}`}>0xA7C91E 0x03FD42</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
