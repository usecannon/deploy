import SafeApiKit, { SafeInfoResponse } from '@safe-global/api-kit'
import { EthersAdapter, Web3Adapter } from '@safe-global/protocol-kit'
import { ethers } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import {
  Address,
  createWalletClient,
  getAddress,
  http,
  isAddress,
  keccak256,
  stringToBytes,
} from 'viem'
import {
  mainnet,
  useAccount,
  useChainId,
  useContractReads,
  useNetwork,
  useQuery,
} from 'wagmi'
import { infuraProvider } from 'wagmi/dist/providers/infura'
import Web3 from 'web3'
import { chains } from '../constants'
import { ChainId, SafeDefinition, useStore } from '../store'
import { SafeTransaction } from '../types'
import * as onchainStore from '../utils/onchain-store'
import { supportedChains } from '../wallet'

export type SafeString = `${ChainId}:${Address}`

export function safeToString(safe: SafeDefinition): SafeString {
  return `${safe.chainId as ChainId}:${safe.address}`
}

export function parseSafe(safeString: string): SafeDefinition {
  const [chainId, address] = safeString.split(':')
  return {
    chainId: Number.parseInt(chainId) as ChainId,
    address: getAddress(address),
  }
}

const addressStringRegex = /^[1-9][0-9]*:0x[a-fA-F0-9]{40}$/

export function isValidSafeString(safeString: string): boolean {
  if (typeof safeString !== 'string') return false
  if (!addressStringRegex.test(safeString)) return false
  const chainId = Number.parseInt(safeString.split(':')[0])
  return chains.some((chain) => chain.id === chainId)
}

export function getSafeFromString(safeString: string): SafeDefinition | null {
  if (!isValidSafeString(safeString)) return null
  const [chainId, address] = safeString.split(':')
  return {
    chainId: Number.parseInt(chainId) as ChainId,
    address: getAddress(address),
  }
}

export function isValidSafe(safe: SafeDefinition): boolean {
  return (
    !!safe &&
    isAddress(safe.address) &&
    typeof safe.chainId === 'number' &&
    supportedChains.some((chain) => chain.id === safe.chainId)
  )
}

export function getShortName(safe: SafeDefinition) {
  return chains.find((chain) => chain.id === safe.chainId)?.shortName
}

export function getSafeShortNameAddress(safe: SafeDefinition) {
  return `${getShortName(safe)}:${getAddress(safe.address)}`
}

export function getSafeUrl(safe: SafeDefinition, pathname = '/home') {
  const address = getSafeShortNameAddress(safe)
  return `https://app.safe.global${pathname}?safe=${address}`
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

function _createSafeApiKit(chainId: number) {
  if (!chainId) return null

  const chain = chains.find((chain) => chain.id === chainId)

  if (!chain?.serviceUrl) return null

  const provider = new ethers.providers.Web3Provider(
    createWalletClient({
      chain: mainnet,
      transport: http(
        infuraProvider({ apiKey: '6b369abb43f44b83a7fb34f6eacb8683' })(mainnet)
          .rpcUrls.http[0]
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  )

  return new SafeApiKit({
    txServiceUrl: chain.serviceUrl,
    ethAdapter: new EthersAdapter({
      ethers,
      signerOrProvider: provider,
    }),
  })
}

export function useSafeReadApi(safeAddress: string): SafeApiKit | null {
  const chainId = useMemo(() => {
    if (!safeAddress) return null
    const [shortName] = safeAddress.split(':')
    const chain = chains.find((chain) => chain.shortName === shortName)
    return chain ? chain.id : null
  }, [safeAddress])

  return useMemo(() => _createSafeApiKit(chainId), [chainId])
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

export function useExecutedTransactions(safe?: SafeDefinition) {
  const txsQuery = useQuery(
    ['safe-service', 'all-txns', safe?.chainId, safe?.address],
    async () => {
      if (!safe) return null
      const safeService = _createSafeApiKit(safe.chainId)
      const res = await safeService.getMultisigTransactions(safe.address)
      return {
        count:
          (res as unknown as { countUniqueNonce: number }).countUniqueNonce ||
          res.count,
        next: res.next,
        previous: res.previous,
        results: res.results
          .filter((tx) => tx.isExecuted)
          .map((tx) => ({
            to: tx.to,
            value: tx.value,
            data: tx.data,
            operation: tx.operation,
            safeTxGas: tx.safeTxGas,
            baseGas: tx.baseGas,
            gasPrice: tx.gasPrice,
            gasToken: tx.gasToken,
            refundReceiver: tx.refundReceiver,
            _nonce: tx.nonce,
            transactionHash: tx.transactionHash,
            safeTxHash: tx.safeTxHash,
          })) as unknown as SafeTransaction[],
      }
    }
  )

  return txsQuery?.data || { count: 0, next: null, previous: null, results: [] }
}

export function usePendingTransactions(safe?: SafeDefinition) {
  const txsQuery = useQuery(
    ['safe-service', 'pending-txns', safe?.chainId, safe?.address],
    async () => {
      if (!safe) return null
      const safeService = _createSafeApiKit(safe.chainId)
      return await safeService.getPendingTransactions(safe.address)
    }
  )

  return txsQuery?.data || { count: 0, next: null, previous: null, results: [] }
}

export function useWalletPublicSafes() {
  const { address } = useAccount()

  const txsQuery = useQuery(
    ['safe-service', 'wallet-safes', address],
    async () => {
      const results: SafeDefinition[] = []
      if (!address) return results
      await Promise.all(
        supportedChains.map(async (chain) => {
          const safeService = _createSafeApiKit(chain.id)
          if (!safeService) return
          const res = await safeService.getSafesByOwner(address)
          if (!Array.isArray(res.safes)) return
          for (const safe of res.safes) {
            results.push({ chainId: chain.id, address: safe as Address })
          }
        })
      )
      return results
    }
  )

  return txsQuery.data || ([] as SafeDefinition[])
}

export function useSafeAddress() {
  const chainId = useChainId()
  return useStore(
    (s) => s.safeAddresses.find((s) => s.chainId === chainId)?.address || null
  )
}

export function useGetPreviousGitInfoQuery(
  safe: SafeDefinition,
  gitRepoUrl: string
) {
  // get previous deploy info git information
  return useContractReads({
    contracts: [
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        abi: onchainStore.ABI as any,
        address: onchainStore.deployAddress,
        functionName: 'getWithAddress',
        args: [
          safe.address,
          keccak256(stringToBytes((gitRepoUrl || '') + 'gitHash')),
        ],
      },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        abi: onchainStore.ABI as any,
        address: onchainStore.deployAddress,
        functionName: 'getWithAddress',
        args: [
          safe.address,
          keccak256(stringToBytes((gitRepoUrl || '') + 'cannonPackage')),
        ],
      },
    ],
  })
}
