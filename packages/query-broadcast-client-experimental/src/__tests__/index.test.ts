import { QueryClient } from '@tanstack/query-core'
import { beforeEach, describe, expect, it } from 'vitest'
import { broadcastQueryClient } from '..'
import type { QueryCache } from '@tanstack/query-core'

describe('broadcastQueryClient', () => {
  let queryClient: QueryClient
  let queryCache: QueryCache

  beforeEach(() => {
    queryClient = new QueryClient()
    queryCache = queryClient.getQueryCache()
  })

  it('should subscribe to the query cache', () => {
    broadcastQueryClient({
      queryClient,
      broadcastChannel: 'test_channel',
    })
    expect(queryCache.hasListeners()).toBe(true)
  })

  it('should not have any listeners after cleanup', () => {
    const unsubscribe = broadcastQueryClient({
      queryClient,
      broadcastChannel: 'test_channel',
    })
    unsubscribe()
    expect(queryCache.hasListeners()).toBe(false)
  })

  it('should sync updates between clients on the same broadcast channel', async () => {
    const receivingClient = new QueryClient()
    const unsubscribe = broadcastQueryClient({
      queryClient,
      broadcastChannel: 'shared_test_channel',
    })
    const unsubscribeReceiver = broadcastQueryClient({
      queryClient: receivingClient,
      broadcastChannel: 'shared_test_channel',
    })

    queryClient.setQueryData(['shared'], { secret: 'data' })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(receivingClient.getQueryData(['shared'])).toEqual({
      secret: 'data',
    })

    unsubscribe()
    unsubscribeReceiver()
  })
})
