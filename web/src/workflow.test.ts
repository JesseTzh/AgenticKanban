import { describe, expect, it } from 'vitest'
import { canEnterCodeReview, stageName } from './workflow'

describe('workflow helpers', () => {
  it('requires at least one commit before code review', () => {
    expect(canEnterCodeReview(0)).toBe(false)
    expect(canEnterCodeReview(1)).toBe(true)
  })

  it('returns Chinese stage name', () => {
    expect(stageName('development_execution')).toBe('开发执行')
  })
})
