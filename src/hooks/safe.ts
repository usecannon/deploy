import Web3 from 'web3'
import SafeApiKit, {
  SafeInfoResponse,
  SafeMultisigTransactionWithTransfersResponse,
} from '@safe-global/api-kit'
import { Address, getAddress, isAddress } from 'viem'
import { Web3Adapter } from '@safe-global/protocol-kit'
import { useAccount, useChainId, useNetwork, useQuery } from 'wagmi'
import { useEffect, useMemo, useState } from 'react'

import { ChainId, State, useStore } from '../store'
import { chains } from '../constants'
import { supportedChains } from '../wallet'

export type SafeString = `${ChainId}:${Address}`

export function safeToString(safe: State['currentSafe']): SafeString {
  return `${safe.chainId}:${safe.address}`
}

export function parseSafe(safeString: string): State['currentSafe'] {
  const [chainId, address] = safeString.split(':')
  return {
    chainId: Number.parseInt(chainId) as ChainId,
    address: getAddress(address),
  }
}

export function isShortName(shortName: string): boolean {
  if (typeof shortName !== 'string') return false
  shortName = shortName.toLowerCase()
  return chains.some((chain) => chain.shortName === shortName)
}

export function isSafeAddress(safeAddress: string): boolean {
  return isAddress(safeAddress)
}

const addressStringRegex = /^[1-9][0-9]*:0x[a-fA-F0-9]{40}$/

export function isValidSafeString(safeString: string): boolean {
  if (typeof safeString !== 'string') return false
  if (!addressStringRegex.test(safeString)) return false
  const chainId = Number.parseInt(safeString.split(':')[0])
  return chains.some((chain) => chain.id === chainId)
}

export function getSafeFromString(
  safeString: string
): State['currentSafe'] | null {
  if (!isValidSafeString(safeString)) return null
  const [chainId, address] = safeString.split(':')
  return {
    chainId: Number.parseInt(chainId) as ChainId,
    address: getAddress(address),
  }
}

export function isValidSafe(safe: State['currentSafe']): boolean {
  return (
    !!safe &&
    isAddress(safe.address) &&
    typeof safe.chainId === 'number' &&
    supportedChains.some((chain) => chain.id === safe.chainId)
  )
}

export function getSafeShortNameAddress(safeAddress: string) {
  if (!isSafeAddress(safeAddress)) return null
  return `${getAddress(safeAddress)}`
}

export function getSafeUrl(safeAddress: string) {
  if (!isSafeAddress(safeAddress)) return null
  return `https://app.safe.global/home?safe=${getSafeShortNameAddress(
    safeAddress
  )}`
}

export function useSafeWriteApi(): SafeApiKit | null {
  const { address, isDisconnected } = useAccount()
  const network = useNetwork()
  const chain = useMemo(
    () => network && chains.find((chain) => chain.id === network.chain?.id),
    [network.chain?.id]
  )

  return useMemo(() => {
    if (!chain || isDisconnected) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const web3 = new Web3((window as any).ethereum) as any

    return new SafeApiKit({
      txServiceUrl: chain.serviceUrl,
      ethAdapter: new Web3Adapter({
        web3,
        signerAddress: address,
      }),
    })
  }, [chain, isDisconnected])
}

function _createSafeApiKit(chainId: number, address: string) {
  const chain = chains.find((chain) => chain.id === chainId)

  if (!chain?.serviceUrl) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const web3 = new Web3((window as any).ethereum) as any

  return new SafeApiKit({
    txServiceUrl: chain.serviceUrl,
    ethAdapter: new Web3Adapter({
      web3,
      signerAddress: address,
    }),
  })
}

export function useSafeReadApi(safeAddress: string): SafeApiKit | null {
  const [chainId, walletAddress] = useMemo(() => {
    if (!safeAddress) return null
    const [shortName, walletAddress] = safeAddress.split(':')
    const chain = chains.find((chain) => chain.shortName === shortName)
    return chain ? [chain.id, walletAddress] : null
  }, [safeAddress])

  return useMemo(
    () => _createSafeApiKit(chainId, walletAddress),
    [chainId, walletAddress]
  )
}

export function useSafeInfo(safeAddress: string) {
  const safeApi = useSafeReadApi(safeAddress)
  const [safeInfo, setSafeInfo] = useState<SafeInfoResponse>(null)

  useEffect(() => {
    if (!safeApi || !safeAddress) return setSafeInfo(null)

    async function loadSafeInfo() {
      const [, address] = safeAddress.split(':')
      try {
        const res = await safeApi.getSafeInfo(address)
        setSafeInfo(res)
      } catch (err) {
        console.error(err)
        setSafeInfo(null)
      }
    }

    loadSafeInfo()
  }, [safeApi, safeAddress])

  return safeInfo
}

export function useExecutedTransactions(safe?: State['currentSafe']) {
  const txsQuery = useQuery(
    ['safe-service', 'all-txns', safe.chainId, safe.address],
    async () => {
      const safeService = _createSafeApiKit(safe.chainId, safe.address)
      const res = await safeService.getMultisigTransactions(safe.address)
      return {
        count:
          (res as unknown as { countUniqueNonce: number }).countUniqueNonce ||
          res.count,
        next: res.next,
        previous: res.previous,
        results: res.results.filter((tx) => tx.isExecuted),
      }
    }
  )

  return txsQuery.data || { count: 0, next: null, previous: null, results: [] }
}

export function useWalletPublicSafes() {
  const { address } = useAccount()
  const [walletSafes, setWalletSafes] = useState<State['safeAddresses']>([])

  useEffect(() => {
    const fetchSafes = async () => {
      if (!address) return

      const safesPromises = supportedChains.map(async (chain) => {
        const safeService = _createSafeApiKit(chain.id, address)

        if (safeService) {
          const safes = await safeService.getSafesByOwner(address)
          return { chainId: chain.id, safes: safes.safes }
        }

        return { chainId: chain.id, safes: [] }
      })

      const safes = await Promise.all(safesPromises)

      const safeAddresses = safes.flatMap((entry) => {
        const chainSafes = entry?.safes || []
        return chainSafes.map((address) => ({
          chainId: entry.chainId as ChainId,
          address: address as `0x${string}`,
        }))
      })

      setWalletSafes(safeAddresses)
    }

    fetchSafes()
  }, [address])

  return walletSafes
}

export function useSafeAddress() {
  const chainId = useChainId()
  return useStore(
    (s) => s.safeAddresses.find((s) => s.chainId === chainId)?.address || null
  )
}
