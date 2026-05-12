import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup, renderToString } from 'react-dom/server'

const serverInsertedHtmlCallbacks: Array<() => React.ReactNode> = []

vi.mock('next/navigation', () => ({
  useServerInsertedHTML: (callback: () => React.ReactNode) => {
    serverInsertedHtmlCallbacks.push(callback)
  },
}))

import { createHydrationStreamProvider } from '../HydrationStreamProvider'

describe('createHydrationStreamProvider', () => {
  afterEach(() => {
    serverInsertedHtmlCallbacks.length = 0
  })

  it('escapes script-breaking payloads before writing streamed hydration HTML', () => {
    const payload =
      '</script><script>globalThis.__xss = 1</script>&\u2028\u2029'
    const onEntries = vi.fn()
    const { Provider } = createHydrationStreamProvider<{ payload: string }>()

    renderToString(
      <Provider onEntries={onEntries} onFlush={() => [{ payload }]}>
        <div>hello</div>
      </Provider>,
    )

    expect(serverInsertedHtmlCallbacks).toHaveLength(1)

    const markup = renderToStaticMarkup(
      <>
        {serverInsertedHtmlCallbacks.map((callback, index) => (
          <React.Fragment key={index}>{callback()}</React.Fragment>
        ))}
      </>,
    )

    expect(markup).toContain(
      '\\u003c/script\\u003e\\u003cscript\\u003eglobalThis.__xss = 1\\u003c/script\\u003e',
    )
    expect(markup).toContain('\\u0026')
    expect(markup).toContain('\\u2028')
    expect(markup).toContain('\\u2029')
    expect(markup).not.toContain('</script><script>globalThis.__xss = 1</script>')
  })
})
