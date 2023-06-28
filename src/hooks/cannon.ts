import _ from 'lodash'
import { Address, useChainId, useNetwork } from 'wagmi'
import { BaseTransaction } from '@safe-global/safe-apps-sdk'
import {
  CannonStorage,
  CannonWrapperGenericProvider,
  ChainArtifacts,
  ChainBuilderRuntime,
  ChainDefinition,
  DeploymentInfo,
  FallbackRegistry,
  OnChainRegistry,
  copyPackage,
  createInitialContext,
  getOutputs,
  registerAction,
} from '@usecannon/builder'
import { EthereumProvider } from 'ganache'
import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { IPFSBrowserLoader } from '../utils/ipfs'
import {
  StepExecutionError,
  build,
  inMemoryLoader,
  inMemoryRegistry,
  loadCannonfile,
} from '../utils/cannon'
import { createFork } from '../utils/rpc'
import { useGitRepo } from './git'
import { useStore } from '../store'

import cannonPluginRouter from 'cannon-plugin-router'
registerAction(cannonPluginRouter)

export type BuildState =
  | {
      status: 'idle' | 'loading' | 'error'
      message: string
    }
  | {
      status: 'success'
      message: string
      url: string
      steps: {
        name: string
        tx: BaseTransaction
      }[]
      skipped: StepExecutionError[]
    }

export function useLoadCannonDefinition(
  repo: string,
  ref: string,
  filepath: string
) {
  const loadGitRepoQuery = useGitRepo(repo, ref, [])

  const loadDefinitionQuery = useQuery(
    ['cannon', 'loaddef', repo, ref, filepath],
    {
      queryFn: async () => {
        return loadCannonfile(repo, ref, filepath)
      },
      enabled: loadGitRepoQuery.isSuccess,
    }
  )

  return {
    loadDefinitionQuery,
    def: loadDefinitionQuery.data?.def,
    filesList: loadDefinitionQuery.data?.filesList,
  }
}

export function useCannonBuild(def: ChainDefinition, upgradeFrom?: string) {
  const chainId = useNetwork().chain?.id
  const safeAddress = useStore((s) =>
    s.safeAddresses.length ? s.safeAddresses[s.safeIndex]?.address : ''
  ) as Address
  const settings = useStore((s) => s.settings)

  const [buildStatus, setBuildStatus] = useState('')
  const [builtStepCount, setBuiltStepCount] = useState(0)

  const buildQuery = useQuery(['cannon', 'build', def, upgradeFrom], {
    queryFn: async () => {
      console.log('SAFE ADDRESS IS', safeAddress)
      setBuildStatus('Creating fork...')
      const fork: EthereumProvider = await createFork({
        url: settings.forkProviderUrl,
        chainId,
        impersonate: [safeAddress],
      }).catch((err) => {
        err.message = `Could not create local fork for build: ${err.message}`
        throw err
      })

      const registry = new OnChainRegistry({
        signerOrProvider: settings.registryProviderUrl,
        address: settings.registryAddress,
      })

      const ipfsLoader = new IPFSBrowserLoader(settings.ipfsUrl)

      setBuildStatus('Loading deployment data...')

      // Load upgrade from deployment from IPFS
      const ctx = await createInitialContext(def, {}, chainId, {})

      let upgradeFromUrl: string = await registry.getUrl(
        upgradeFrom || `${def.getName(ctx)}:latest`,
        `${chainId}-${settings.preset}`
      )

      if (!upgradeFromUrl && upgradeFrom) {
        throw new Error('upgrade from deployment not found')
      }

      const incompleteDeploy = upgradeFromUrl ? await ipfsLoader.read(upgradeFromUrl) : null

      console.log('upgrade from: ', incompleteDeploy)

      const provider = new CannonWrapperGenericProvider(
        {},
        new ethers.providers.Web3Provider(fork),
        false
      )

      // Create a regsitry that loads data first from Memory to be able to utilize
      // the locally built data
      const fallbackRegistry = new FallbackRegistry([
        inMemoryRegistry,
        registry,
      ])

      const { newState, simulatedTxs, skippedSteps, runtime } = await build({
        chainId: chainId,
        provider,
        def,
        options: {},
        defaultSignerAddress: safeAddress,
        incompleteDeploy,
        registry: fallbackRegistry,
        loaders: { mem: inMemoryLoader, ipfs: ipfsLoader },
        onStepExecute: (stepType: string, stepLabel: string, stepOutput: ChainArtifacts) => {
          setBuildStatus(`Building ${stepType}.${stepLabel}...`)
        }
      })

      console.log('CANNON BUILD FINISH', { runtime, state: newState, simulatedTxs, skippedSteps })

      if (simulatedTxs.length === 0) {
        throw new Error(
          'There are no transactions that can be executed on Safe. Skipped Steps:\n' +
          skippedSteps.map(s => `${s.name}: ${s.err.toString()}`).join('\n')
        )
      }

      const steps = await Promise.all(
        simulatedTxs.map(async (executedTx) => {
          const tx = await provider.getTransaction(executedTx.hash)
          return {
            name: executedTx.deployedOn,
            tx: {
              to: tx.to,
              value: tx.value.toString(),
              data: tx.data,
            } as BaseTransaction,
          }
        })
      )

      if (fork) await fork.disconnect()

      return { runtime, state: newState, steps }
    },
    enabled: !_.isNil(def),
    staleTime: Infinity,
    cacheTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false
  })

  return {
    buildQuery,
    buildStatus
  }
}

export function useCannonWriteDeployToIpfs(
  runtime: ChainBuilderRuntime,
  deployInfo: DeploymentInfo
) {
  const settings = useStore((s) => s.settings)

  const writeToIpfsMutation = useMutation({
    mutationFn: async () => {
      const def = new ChainDefinition(deployInfo.def)
      const ctx = await createInitialContext(
        def,
        deployInfo.meta,
        runtime.chainId,
        deployInfo.options
      )

      return await copyPackage({
        fromStorage: runtime,
        toStorage: new CannonStorage(
          new OnChainRegistry({
            signerOrProvider: settings.registryProviderUrl,
            address: settings.registryAddress,
          }),
          { ipfs: new IPFSBrowserLoader(settings.ipfsUrl) },
          'ipfs'
        ),
        packageRef: `${def.getName(ctx)}-${def.getVersion(ctx)}`,
        variant: `${runtime.chainId}-${settings.preset}`,
        tags: ['latest'],
      })
    },
  })

  return {
    writeToIpfsMutation,
  }
}

export function useCannonPackage(packageRef: string, variant = '') {
  const chainId = useChainId()

  if (!variant) {
    variant = `${chainId}-main`
  }

  const settings = useStore((s) => s.settings)

  const registryQuery = useQuery(['cannon', 'registry', packageRef, variant], {
    queryFn: async () => {
      if (packageRef.length < 3) {
        return null
      }

      const registry = new OnChainRegistry({
        signerOrProvider: settings.registryProviderUrl,
        address: settings.registryAddress,
      })

      const url = await registry.getUrl(packageRef, variant)

      if (url) {
        return url
      } else {
        throw new Error(`package not found: ${packageRef} (${variant})`)
      }
    },
  })

  const pkgUrl = registryQuery.data

  const ipfsQuery = useQuery(['cannon', 'pkg', pkgUrl], {
    queryFn: async () => {
      const loader = new IPFSBrowserLoader(settings.ipfsUrl)

      const deployInfo: DeploymentInfo = await loader.read(pkgUrl)

      if (deployInfo) {
        return deployInfo
      } else {
        throw new Error('failed to download package data')
      }
    },
    enabled: pkgUrl !== '',
  })

  return {
    registryQuery,
    ipfsQuery,
    pkgUrl,
    pkg: ipfsQuery.data,
  }
}

type ContractInfo = {
  [x: string]: { address: Address; abi: any[] }
}

export function getContractsRecursive(
  outputs: ChainArtifacts,
  signerOrProvider: ethers.Signer | ethers.providers.Provider,
  prefix?: string
): ContractInfo {
  let contracts = _.mapValues(outputs.contracts, (ci) => {
    return { address: ci.address as Address, abi: ci.abi }
  })
  if (prefix) {
    contracts = _.mapKeys(
      contracts,
      (_, contractName) => `${prefix}.${contractName}`
    )
  }
  for (const [importName, importOutputs] of Object.entries(
    outputs.imports || {}
  )) {
    const newContracts = getContractsRecursive(
      importOutputs,
      signerOrProvider,
      importName
    )
    contracts = { ...contracts, ...newContracts }
  }
  return contracts
}

export function useCannonPackageContracts(packageRef: string, variant = '') {
  const pkg = useCannonPackage(packageRef, variant)
  const [contracts, setContracts] = useState<ContractInfo | null>(null)
  const settings = useStore((s) => s.settings)

  useEffect(() => {
    const getContracts = async () => {
      if (pkg.pkg) {
        const info = pkg.pkg

        const loader = new IPFSBrowserLoader(settings.ipfsUrl)
        const readRuntime = new ChainBuilderRuntime(
          {
            provider: null,
            chainId: 1,
            getSigner: () => {
              return Promise.reject(new Error('unnecessary'))
            },
            snapshots: false,
            allowPartialDeploy: false,
          },
          null,
          { ipfs: loader }
        )

        const outputs = await getOutputs(
          readRuntime,
          new ChainDefinition(info.def),
          info.state
        )

        setContracts(getContractsRecursive(outputs, null))
      }
    }

    getContracts()
  }, [pkg.pkg])

  return { contracts, ...pkg }
}
