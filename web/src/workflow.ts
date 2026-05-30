export const STAGES = [
  ['requirement_clarification','需求澄清'],
  ['technical_breakdown','技术拆解'],
  ['development_execution','开发执行'],
  ['code_review','代码复核'],
  ['test_acceptance','测试验收'],
  ['done_archive','完成归档']
] as const

export function stageName(key: string): string {
  return STAGES.find(([k]) => k === key)?.[1] ?? key
}

export function canEnterCodeReview(commitCount: number): boolean {
  return commitCount > 0
}
