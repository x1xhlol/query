import { afterEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { createHydrationStreamProvider } from '../HydrationStreamProvider'

const insertedHtml: Array<string> = []

vi.mock('@tanstack/react-query', () => ({ isServer: true }), { virtual: true })

vi.mock('next/navigation', () => ({
  useServerInsertedHTML: (callback: () => unknown) => {
    const scriptElement = callback() as {
      props?: {
        dangerouslySetInnerHTML?: {
          __html?: unknown
        }
      }
    } | null

    const html = scriptElement?.props?.dangerouslySetInnerHTML?.__html
    if (typeof html === 'string') {
      insertedHtml.push(html)
    }
  },
}))

function renderHydrationScript<TShape>(props: {
  entries: Array<TShape>
  transformer?: {
    serialize: (value: TShape) => unknown
    deserialize: (value: unknown) => TShape
  }
}) {
  const { Provider } = createHydrationStreamProvider<TShape>()

  renderToString(
    <Provider
      onEntries={() => {}}
      onFlush={() => props.entries}
      transformer={props.transformer}
    >
      <React.Fragment />
    </Provider>,
  )

  const scriptBody = insertedHtml.at(-1)
  expect(scriptBody).toBeDefined()
  return scriptBody!
}

afterEach(() => {
  insertedHtml.length = 0
})

describe('createHydrationStreamProvider', () => {
  it('escapes script-breaking payloads before emitting streamed HTML', () => {
    const payload = '</script><script>globalThis.__xss=1</script>'

    const scriptBody = renderHydrationScript({
      entries: [{ payload }],
    })

    expect(scriptBody).not.toContain(payload)
    expect(scriptBody).not.toContain('</script>')
    expect(scriptBody).toContain(
      '\\u003c/script\\u003e\\u003cscript\\u003eglobalThis.__xss=1\\u003c/script\\u003e',
    )
  })

  it('escapes custom transformer output before inserting inline scripts', () => {
    const payload = '</script><img src=x onerror=globalThis.__xss=1>'

    const scriptBody = renderHydrationScript<string>({
      entries: [payload],
      transformer: {
        serialize: (value) => value,
        deserialize: (value) => value as string,
      },
    })

    expect(scriptBody).not.toContain(payload)
    expect(scriptBody).not.toContain('</script><img')
    expect(scriptBody).toContain(
      '\\u003c/script\\u003e\\u003cimg src=x onerror=globalThis.__xss=1\\u003e',
    )
  })

  it('escapes html-significant and line-separator characters', () => {
    const payload = '<>&\u2028\u2029'

    const scriptBody = renderHydrationScript({
      entries: [{ payload }],
    })

    expect(scriptBody).toContain('\\u003c\\u003e\\u0026\\u2028\\u2029')
  })
})
