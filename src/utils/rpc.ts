import * as chains from '@wagmi/core/chains'
import Ganache from 'ganache'
import { ethers } from 'ethers'

function findChainUrl(chainId: number) {
  if (typeof chainId !== 'number') {
    throw new Error(`Invalid chainId: ${chainId}`)
  }

  const chain = Object.values(chains).find((c) => c.id === chainId)
  if (!chain) throw new Error(`Unknown chainId: ${chainId}`)

  const url = chain.rpcUrls?.default?.http?.[0]
  if (!url) throw new Error(`Chaind ${chain.name} dos not have a default url`)

  return url
}

export async function createFork({
  chainId,
  impersonate = [],
}: {
  chainId: number
  impersonate: string[]
}) {
  const chainUrl = findChainUrl(chainId)

  const node = Ganache.provider({
    wallet: { unlockedAccounts: impersonate },
    chain: { chainId: chainId },
    fork: { url: chainUrl },
  })

  const bunchOfEth = ethers.utils.hexValue(
    ethers.utils.parseUnits('10000', 'ether').toHexString()
  )

  await Promise.all(
    impersonate.map((addr) =>
      node.send('evm_setAccountBalance', [addr, bunchOfEth])
    )
  )

  return node
}
