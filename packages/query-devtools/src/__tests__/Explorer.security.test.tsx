import { describe, expect, it, vi } from 'vitest'
import { QueryClient, onlineManager } from '@tanstack/query-core'
import { render } from '@solidjs/testing-library'
import { ThemeContext } from '../contexts'
import { QueryDevtoolsContext } from '../contexts/QueryDevtoolsContext'
import Explorer from '../Explorer'

vi.mock('goober', () => {
  let counter = 0
  const css = Object.assign(() => `tsqd-${++counter}`, {
    bind: () => css,
  })
  return { css, glob: () => {}, setup: () => {} }
})

describe('Explorer security rendering', () => {
  it('renders hostile query data as inert text instead of HTML nodes', () => {
    const payload = '<img src="xss-probe" onerror="globalThis.__xss=1">'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['xss-render'], { payload })

    const activeQuery = queryClient
      .getQueryCache()
      .find({ queryKey: ['xss-render'] })

    expect(activeQuery).toBeDefined()

    const rendered = render(() => (
      <QueryDevtoolsContext.Provider
        value={{
          client: queryClient,
          queryFlavor: 'TanStack Query',
          version: '5',
          onlineManager,
        }}
      >
        <ThemeContext.Provider value={() => 'dark'}>
          <Explorer
            label="Data"
            defaultExpanded={['Data']}
            value={activeQuery!.state.data}
            editable={true}
            activeQuery={activeQuery!}
          />
        </ThemeContext.Provider>
      </QueryDevtoolsContext.Provider>
    ))

    expect(rendered.getByDisplayValue(payload)).toBeInTheDocument()
    expect(rendered.container.querySelector('img[src="xss-probe"]')).toBeNull()
  })
})
