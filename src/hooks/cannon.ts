import _ from 'lodash'
import { Address, useChainId, useNetwork } from 'wagmi'
import { BaseTransaction } from '@safe-global/safe-apps-sdk'
import {
  CannonStorage,
  CannonWrapperGenericProvider,
  ChainArtifacts,
  ChainBuilderRuntime,
  build as cannonBuild,
  ChainDefinition,
  DeploymentInfo,
  Events,
  FallbackRegistry,
  OnChainRegistry,
  copyPackage,
  createInitialContext,
  getOutputs,
  registerAction,
  InMemoryRegistry,
} from '@usecannon/builder'
import { EthereumProvider } from 'ganache'
import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import {
  UseMutationOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query'

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

// TODO: in the future register actions that are found in a cannon definition automatically with stubs
import cannonPluginRouter from 'cannon-plugin-router'
registerAction({
  ...cannonPluginRouter,
  exec: () => {
    throw new Error('cannot execute step')
  },
})

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

let currentRuntime: ChainBuilderRuntime|null = null;

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

export function useCannonBuild(def: ChainDefinition, prevDeploy: DeploymentInfo) {
  const chainId = useNetwork().chain?.id
  const currentSafe = useStore((s) => s.currentSafe)
  const settings = useStore((s) => s.settings)

  const [buildStatus, setBuildStatus] = useState('')
  const [builtStepCount, setBuiltStepCount] = useState(0)

  const [buildResult, setBuildResult] = useState<{
    runtime: ChainBuilderRuntime
    state: any
    steps: { name: string; gas: ethers.BigNumber; tx: BaseTransaction }[]
  } | null>(null)

  const [buildError, setBuildError] = useState<string | null>(null)

  const buildFn = async () => {
    setBuildStatus('Creating fork...')
    const fork: EthereumProvider = await createFork({
      url: settings.forkProviderUrl,
      chainId,
      impersonate: [currentSafe.address],
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

    console.log('cannon.ts: upgrade from: ', prevDeploy)

    const provider = new CannonWrapperGenericProvider(
      {},
      new ethers.providers.Web3Provider(fork),
      false
    )

    // Create a regsitry that loads data first from Memory to be able to utilize
    // the locally built data
    const fallbackRegistry = new FallbackRegistry([inMemoryRegistry, registry])

    const loaders = { mem: inMemoryLoader, ipfs: ipfsLoader };

    currentRuntime = new ChainBuilderRuntime(
      {
        provider,
        chainId,
        getSigner: async (addr: string) => provider.getSigner(addr),
        getDefaultSigner: async () => provider.getSigner(currentSafe.address),
        snapshots: false,
        allowPartialDeploy: true,
        publicSourceCode: true,
      },
      fallbackRegistry,
      loaders
    )
  
    const simulatedSteps: ChainArtifacts[] = []
    const skippedSteps: StepExecutionError[] = []
  
  
  
    currentRuntime.on(
      Events.PostStepExecute,
      (stepType: string, stepLabel: string, stepOutput: ChainArtifacts) => {
        simulatedSteps.push(stepOutput)
        setBuildStatus(`Building ${stepType}.${stepLabel}...`)
      }
    )
  
    currentRuntime.on(Events.SkipDeploy, (stepName: string, err: Error) => {
      console.log(stepName, err)
      skippedSteps.push({ name: stepName, err })
    })
  
    if (prevDeploy) {
      await currentRuntime.restoreMisc(prevDeploy.miscUrl)
    }
  
    const ctx = await createInitialContext(
      def,
      prevDeploy?.meta || {},
      chainId,
      prevDeploy?.options || {}
    )
  
    const newState = await cannonBuild(
      currentRuntime,
      def,
      prevDeploy?.state ?? {},
      ctx
    )
  
    const simulatedTxs = simulatedSteps
      .map((s) => !!s?.txns && Object.values(s.txns))
      .filter((tx) => !!tx)
      .flat()


    /*const { newState, simulatedTxs, skippedSteps, runtime } = await build({
      chainId: chainId,
      provider,
      def,
      options: {},
      defaultSignerAddress: currentSafe.address,
      incompleteDeploy,
      registry: fallbackRegistry,
      loaders: { mem: inMemoryLoader, ipfs: ipfsLoader },
      onStepExecute: (
        stepType: string,
        stepLabel: string,
        stepOutput: ChainArtifacts
      ) => {
        setBuildStatus(`Building ${stepType}.${stepLabel}...`)
      },
    })*/

    if (simulatedTxs.length === 0) {
      throw new Error(
        'There are no transactions that can be executed on Safe. Skipped Steps:\n' +
          skippedSteps.map((s) => `${s.name}: ${s.err.toString()}`).join('\n')
      )
    }

    const steps = await Promise.all(
      simulatedTxs.map(async (executedTx) => {
        const tx = await provider.getTransaction(executedTx.hash)
        const receipt = await provider.getTransactionReceipt(executedTx.hash)
        return {
          name: executedTx.deployedOn,
          gas: receipt.gasUsed,
          tx: {
            to: tx.to,
            value: tx.value.toString(),
            data: tx.data,
          } as BaseTransaction,
        }
      })
    )

    if (fork) await fork.disconnect()

    return { runtime: currentRuntime, state: newState, steps }
  }

  function doBuild() {
    console.log('cannon.ts: do build called', currentRuntime)
    if (def && buildStatus === '') {
      setBuildResult(null)
      setBuildError(null)
      buildFn()
        .then((res) => {
          setBuildResult(res)
        })
        .catch((err) => {
          setBuildError(err.toString())
        })
        .finally(() => {
          setBuildStatus('')
          // if we were cancelled it means we have a change queued up. Immediately run a new build
          if (currentRuntime.isCancelled()) {
            doBuild()
          }
        })
    } else if (currentRuntime) {
      console.log('cannon.ts: cancel current build')
      currentRuntime.cancel()
    }
  }

  // stringify the def to make it easier to detect equality
  useEffect(doBuild, [def && JSON.stringify(def.toJson()) , JSON.stringify(prevDeploy)])

  return {
    buildStatus,
    buildResult,
    buildError,
  }
}

type IPFSPackageWriteResult = {
  packageRef: string,
  mainUrl: string,
  publishTxns: string[]
}

export function useCannonWriteDeployToIpfs(
  runtime: ChainBuilderRuntime,
  deployInfo: DeploymentInfo,
  metaUrl: string,
  mutationOptions: Partial<UseMutationOptions> = {}
) {
  const settings = useStore((s) => s.settings)

  const writeToIpfsMutation = useMutation<IPFSPackageWriteResult>({
    ...mutationOptions,
    mutationFn: async () => {
      const def = new ChainDefinition(deployInfo.def)
      const ctx = await createInitialContext(
        def,
        deployInfo.meta,
        runtime.chainId,
        deployInfo.options
      )

      const packageRef = `${def.getName(ctx)}:${def.getVersion(ctx)}`
      const variant = `${runtime.chainId}-${settings.preset}`

      await runtime.registry.publish([packageRef], variant, await runtime.loaders.mem.put(deployInfo), metaUrl)

      const memoryRegistry = new InMemoryRegistry()

      const publishTxns = await copyPackage({
        fromStorage: runtime,
        toStorage: new CannonStorage(
          memoryRegistry,
          { ipfs: new IPFSBrowserLoader(settings.ipfsUrl) },
          'ipfs'
        ),
        packageRef,
        variant,
        tags: ['latest'],
      });

      // load the new ipfs url
      console.log('MEMORY REGISTRY RESULT', memoryRegistry, packageRef, variant)
      const mainUrl = await memoryRegistry.getUrl(packageRef, variant)

      return {
        packageRef,
        mainUrl,
        publishTxns
      }
    },
  } as any) // TODO: why is ts having a freak out fit about this

  return {
    writeToIpfsMutation,
    deployedIpfsHash: writeToIpfsMutation.data?.mainUrl
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
      const metaUrl = await registry.getMetaUrl(packageRef, variant)

      if (url) {
        return { url, metaUrl }
      } else {
        throw new Error(`package not found: ${packageRef} (${variant})`)
      }
    },
  })

  const pkgUrl = registryQuery.data?.url

  const ipfsQuery = useQuery(['cannon', 'pkg', pkgUrl], {
    queryFn: async () => {
      const loader = new IPFSBrowserLoader(
        settings.ipfsUrl || 'https://ipfs.io/ipfs/'
      )

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
    metaUrl: registryQuery.data?.metaUrl,
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

        const loader = new IPFSBrowserLoader(
          settings.ipfsUrl || 'https://ipfs.io/ipfs/'
        )
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
