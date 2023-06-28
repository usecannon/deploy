import Web3 from 'web3'
import SafeApiKit, {
  SafeInfoResponse,
  SafeMultisigTransactionListResponse,
} from '@safe-global/api-kit'
import { Web3Adapter } from '@safe-global/protocol-kit'
import { getAddress, isAddress } from 'viem'
import { useAccount, useChainId, useNetwork } from 'wagmi'
import { useEffect, useMemo, useState } from 'react'

import { State, useStore } from '../store'
import { chains } from '../constants'
import { supportedChains } from '../wallet'

export function isShortName(shortName: string): boolean {
  if (typeof shortName !== 'string') return false
  shortName = shortName.toLowerCase()
  return chains.some((chain) => chain.shortName === shortName)
}

export function isSafeAddress(safeAddress: string): boolean {
  return isAddress(safeAddress)
}

export function isValidSafe(safe: State['currentSafe']): boolean {
  return (
    !!safe &&
    isAddress(safe.address) &&
    typeof safe.chainId === 'number' &&
    supportedChains.some((chain) => chain.id === safe.chainId)
  )
}

export function getSafeAddress(safeAddress: string) {
  if (!isSafeAddress(safeAddress)) return null
  return `${getAddress(safeAddress)}`
}

export function getSafeUrl(safeAddress: string) {
  if (!isSafeAddress(safeAddress)) return null
  return `https://app.safe.global/home?safe=${getSafeAddress(safeAddress)}`
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

export function usePendingTransactions(safeAddress: string) {
  const safeApi = useSafeReadApi(safeAddress)
  const [pendingTransactions, setPendingTransactions] = useState<
    SafeMultisigTransactionListResponse['results']
  >([])

  useEffect(() => {
    if (!safeApi || !safeAddress) return setPendingTransactions([])

    async function loadPendingTransactions() {
      const [, address] = safeAddress.split(':')
      try {
        const res = await safeApi.getPendingTransactions(address)
        setPendingTransactions(res.results)
      } catch (err) {
        console.error(err)
        setPendingTransactions([])
      }
    }

    loadPendingTransactions()
  }, [safeApi, safeAddress])

  return pendingTransactions
}

export const loadWalletPublicSafes = () => {
  const { address } = useAccount()
  const addSafeAddresses = useStore((s) => s.addSafeAddresses)

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
          address: address as `0x${string}`,
          chainId: entry.chainId,
        }))
      })

      addSafeAddresses(safeAddresses)
    }

    fetchSafes()
  }, [address])
}

export function useSafeAddress() {
  const chainId = useChainId()
  return useStore(
    (s) => s.safeAddresses.find((s) => s.chainId === chainId)?.address || null
  )
}
