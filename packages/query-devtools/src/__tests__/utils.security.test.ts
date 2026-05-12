import { describe, expect, it } from 'vitest'
import { deleteNestedDataByPath, updateNestedDataByPath } from '../utils'

describe('devtools nested data helpers security behavior', () => {
  it('does not pollute Object.prototype when updating a __proto__ path', () => {
    delete (Object.prototype as Record<string, unknown>).polluted

    try {
      updateNestedDataByPath({}, ['__proto__', 'polluted'], 'yes')

      expect((Object.prototype as Record<string, unknown>).polluted).toBe(
        undefined,
      )
      expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    } finally {
      delete (Object.prototype as Record<string, unknown>).polluted
    }
  })

  it('does not delete properties from Object.prototype via a __proto__ path', () => {
    ;(Object.prototype as Record<string, unknown>).polluted = 'yes'

    try {
      deleteNestedDataByPath({}, ['__proto__', 'polluted'])

      expect((Object.prototype as Record<string, unknown>).polluted).toBe(
        'yes',
      )
    } finally {
      delete (Object.prototype as Record<string, unknown>).polluted
    }
  })
})
