import SafeApiKit from '@safe-global/api-kit'
import { getAddress, isAddress } from 'viem'
import { useMemo } from 'react'
import { useNetwork } from 'wagmi'

import { useStore } from '../store'

// Service urls taken from https://docs.safe.global/learn/safe-core/safe-core-api/available-services
// shortNames taken from https://github.com/ethereum-lists/chains/blob/master/_data/chains
const chains = {
  1: {
    serviceUrl: 'https://safe-transaction-mainnet.safe.global/',
    shortName: 'eth',
  },
  5: {
    serviceUrl: 'https://safe-transaction-goerli.safe.global/',
    shortName: 'gor',
  },
  10: {
    serviceUrl: 'https://safe-transaction-optimism.safe.global/',
    shortName: 'oeth',
  },
  56: {
    serviceUrl: 'https://safe-transaction-bsc.safe.global/',
    shortName: 'bnb',
  },
  100: {
    serviceUrl: 'https://safe-transaction-gnosis-chain.safe.global/',
    shortName: 'gno',
  },
  137: {
    serviceUrl: 'https://safe-transaction-polygon.safe.global/',
    shortName: 'matic',
  },
  42161: {
    serviceUrl: 'https://safe-transaction-arbitrum.safe.global/',
    shortName: 'arb1',
  },
  43114: {
    serviceUrl: 'https://safe-transaction-avalanche.safe.global/',
    shortName: 'avax',
  },
  84531: {
    serviceUrl: 'https://safe-transaction-base-testnet.safe.global/',
    shortName: 'basegor',
  },
  1313161554: {
    serviceUrl: 'https://safe-transaction-aurora.safe.global/',
    shortName: 'aurora',
  },
}

export function isShortName(shortName: string): boolean {
  if (typeof shortName !== 'string') return false
  shortName = shortName.toLowerCase()
  return Object.values(chains).some((chain) => chain.shortName === shortName)
}

export function isSafeAddress(safeAddress: string): boolean {
  if (typeof safeAddress !== 'string') return false
  const splitted = safeAddress.trim().split(':')
  if (splitted.length !== 2) return false
  const [shortName, address] = splitted
  return isShortName(shortName) && isAddress(address)
}

export function getSafeAddress(safeAddress: string) {
  if (!isSafeAddress(safeAddress)) return null
  const [shortName, address] = safeAddress.trim().split(':')
  return `${shortName.toLowerCase()}:${getAddress(address)}`
}

export function getSafeUrl(safeAddress: string) {
  if (!isSafeAddress(safeAddress)) return null
  return `https://app.safe.global/home?safe=${getSafeAddress(safeAddress)}`
}

export function useSafeApi(): SafeApiKit | null {
  const { chain } = useNetwork()
  return useMemo<SafeApiKit>(() => {
    if (!chains[chain.id]) return null
    new SafeApiKit(chains[chain.id].serviceUrl)
  }, [chain])
}
