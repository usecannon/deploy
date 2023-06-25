import Web3 from 'web3'
import SafeApiKit, {
  SafeInfoResponse,
  SafeMultisigTransactionListResponse,
} from '@safe-global/api-kit'
import { Web3Adapter } from '@safe-global/protocol-kit'
import { getAddress, isAddress } from 'viem'
import { useAccount, useNetwork } from 'wagmi'
import { useEffect, useMemo, useState } from 'react'

import { chains } from '../constants'
import { useStore } from '../store'
import { supportedChains } from '../wallet'

export function isShortName(shortName: string): boolean {
  if (typeof shortName !== 'string') return false
  shortName = shortName.toLowerCase()
  return chains.some((chain) => chain.shortName === shortName)
}

export function isSafeAddress(safeAddress: string): boolean {
  return isAddress(safeAddress)
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

export function useSafeReadApi(safeAddress: string): SafeApiKit | null {
  const serviceUrl = useMemo(() => {
    if (!safeAddress) return null
    const [shortName] = safeAddress.split(':')
    const chain = chains.find((chain) => chain.shortName === shortName)
    return chain?.serviceUrl || null
  }, [safeAddress])

  return useMemo(() => {
    if (!serviceUrl) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const web3 = new Web3((window as any).ethereum) as any

    return new SafeApiKit({
      txServiceUrl: serviceUrl,
      ethAdapter: new Web3Adapter({ web3 }),
    })
  }, [serviceUrl])
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
export const useGetSafeAddresses = (): void => {
  const { address } = useAccount()
  const setSafeAddresses = useStore((state) => state.setSafeAddresses)

  useEffect(() => {
    const fetchSafes = async () => {
      if (address) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const web3 = new Web3((window as any).ethereum) as any

        const safesPromises = supportedChains.map(async (chain) => {
          const chainData = chains.find((c) => chain.id === c.id)
          if (chainData?.serviceUrl) {
            const safeService = new SafeApiKit({
              txServiceUrl: chainData.serviceUrl,
              ethAdapter: new Web3Adapter({ web3 }),
            })
            const safes = await safeService.getSafesByOwner(address)
            return { chainId: chain.id, safes: safes.safes }
          }
          return { chainId: chain.id, safes: [] }
        })

        const safes = await Promise.all(safesPromises)

        const result = safes.flatMap((entry) => {
          const chainSafes = entry?.safes || []
          return chainSafes.map((address) => ({
            chainId: entry.chainId,
            address: address as `0x${string}`,
          }))
        })

        setSafeAddresses(result)
      }
    }

    fetchSafes()
  }, [address, setSafeAddresses])
}
