import type { AgentKey, AgentWorkDetail, Commit, Project, Repository, Stage, Task } from '@/types'

const projectID = 'demo-product-platform'

export const demoProjects: Project[] = [
  { ID: projectID, Name: '产品交付平台', Description: '面向产品团队的 Agentic Coding 协作看板。', CreatedAt: '2026-07-15T09:00:00Z', UpdatedAt: '2026-08-01T10:30:00Z' },
  { ID: 'demo-mobile-experience', Name: '移动端体验升级', Description: '移动端工作流与交付质量优化。', CreatedAt: '2026-07-20T09:00:00Z', UpdatedAt: '2026-08-02T08:15:00Z' },
]

export const demoStages: Stage[] = [
  { Key: 'requirement_clarification', Name: '需求澄清', Position: 0 },
  { Key: 'technical_breakdown', Name: '技术拆解', Position: 1 },
  { Key: 'code_review', Name: '代码审核', Position: 2 },
  { Key: 'test_acceptance', Name: '测试验收', Position: 3 },
]

export const demoTasks: Task[] = [
  { ID: 'demo-task-dashboard', ProjectID: projectID, ParentID: '', Title: '定义项目健康度看板', Description: '梳理项目健康度指标、数据来源与展示优先级。', StageKey: 'requirement_clarification', Status: 'not_ready', AgentReady: false, Completed: false, AgentID: '' },
  { ID: 'demo-task-notifications', ProjectID: projectID, ParentID: '', Title: '拆解通知中心实现方案', Description: '完成通知中心的技术拆解与依赖识别。', StageKey: 'technical_breakdown', Status: 'pending_human_review', AgentReady: false, Completed: false, AgentID: 'delivery-agent' },
  { ID: 'demo-task-webhook', ProjectID: projectID, ParentID: '', Title: '接入仓库 Webhook 校验', Description: '校验 GitHub 推送事件并关联 Commit。', StageKey: 'code_review', Status: 'agentic_ready', AgentReady: true, Completed: false, AgentID: 'review-agent' },
  { ID: 'demo-task-release', ProjectID: projectID, ParentID: '', Title: '发布候选版本验收', Description: '执行跨浏览器验收并确认发布结果。', StageKey: 'test_acceptance', Status: 'not_ready', AgentReady: false, Completed: false, AgentID: '' },
]

export const demoRepositories: Repository[] = [
  { ID: 'demo-repo-web', ProjectID: projectID, Name: 'agentic-kanban-web', GitURL: 'https://github.com/example/agentic-kanban-web', WebhookSecret: 'demo-webhook-secret', WebhookEnabled: true },
]

export const demoCommits: Commit[] = [
  { ID: 'demo-commit-1', ProjectID: projectID, RepositoryID: 'demo-repo-web', SHA: '8d3f4c7e9b15a6c2d4e8f0a1b3c5d7e9f2a4b6c8', Message: 'feat: add webhook signature validation', Author: 'developer', Branch: 'feat/webhook-validation', CommittedAt: '2026-08-01T08:42:00Z' },
]

export const demoAgentKeys: AgentKey[] = [
  { id: 'demo-agent-key-1', name: 'Delivery Agent', owner_id: 'demo-user', owner_username: 'demo', created_at: '2026-07-28T09:00:00Z' },
]

export const demoAgentWork: AgentWorkDetail = {
  Runs: [{ ID: 'demo-run-1', TaskID: 'demo-task-notifications', AgentID: 'delivery-agent', AgentKeyName: 'Delivery Agent', AgentOwnerUsername: 'demo', WorkType: 'technical_breakdown', Status: 'completed', Result: '已完成事件模型、订阅策略和消息投递的技术拆解。', Passed: true, CreatedAt: '2026-08-01T10:00:00Z' }],
  HumanReviews: [{ ID: 'demo-review-1', TaskID: 'demo-task-notifications', AgentRunID: 'demo-run-1', Decision: 'pending', Note: '等待产品负责人确认通知优先级。', ReviewerID: 'demo-user', CreatedAt: '2026-08-01T10:30:00Z' }],
}
