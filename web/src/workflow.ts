export const STAGES = [
  ['requirement_clarification','需求澄清'],
  ['technical_breakdown','技术拆解'],
  ['code_review','代码审核'],
  ['test_acceptance','测试验收']
] as const

export function stageName(key: string): string {
  return STAGES.find(([k]) => k === key)?.[1] ?? key
}

export function canEnterCodeReview(commitCount: number): boolean {
  return commitCount > 0
}
