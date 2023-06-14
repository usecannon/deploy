import { BaseTransaction } from '@safe-global/safe-apps-sdk'
import {
  CannonWrapperGenericProvider,
  ChainBuilderRuntime,
  ChainDefinition,
  DeploymentInfo,
  FallbackRegistry,
  InMemoryRegistry,
  OnChainRegistry,
  getOutputs,
} from '@usecannon/builder'
import { EthereumProvider } from 'ganache'
import { ethers } from 'ethers'
import { useEffect } from 'react'
import { useNetwork } from 'wagmi'
import { useQuery } from '@tanstack/react-query'

import { IPFSBrowserLoader, parseIpfsHash } from '../utils/ipfs'
import { StepExecutionError, build, createPublishData } from '../utils/cannon'
import { Store, useStore } from '../store'
import { createFork } from '../utils/rpc'
import { getSafeChain } from './safe'

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

interface BuildProps {
  cid: string
}

export function useCannonBuild() {
  const chainId = useNetwork().chain?.id
  const safeAddress = useStore((s) =>
    safeAddress ? s.safeAddress.split(':')[1] : ''
  )
  const settings = useStore((s) => s.settings)
  const setBuildState = useStore(
    (s) => (buildState: BuildState) => s.setBuild({ buildState })
  )

  const startBuild = async (props: BuildProps) => {
    if (!props.cid) return setBuildState({ status: 'idle', message: '' })

    setBuildState({
      status: 'loading',
      message: 'Loading build...',
    })

    const cid = parseIpfsHash(props.cid)

    if (!cid) {
      return setBuildState({
        status: 'error',
        message: 'Package url on IPFS must have the format "@ipfs:Qm..."',
      })
    }

    const packageUrl = `@ipfs:${cid}`

    let fork: EthereumProvider
    try {
      fork = await createFork({
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

      const loader = new IPFSBrowserLoader(settings.ipfsUrl, registry)

      setBuildState({
        status: 'loading',
        message: 'Loading deployment data',
      })

      // Load partial deployment from IPFS
      const incompleteDeploy = await loader.read(packageUrl)

      console.log('Deploy: ', incompleteDeploy)

      if (!incompleteDeploy) {
        throw new Error(
          `Package not found: ${packageUrl} (chainId: ${chainId} | preset: ${settings.preset})`
        )
      }

      if (incompleteDeploy.status === 'none') {
        throw new Error('Selected deployment is not initialized')
      }

      if (incompleteDeploy.status === 'complete') {
        throw new Error(
          'Selected deployment is already completed, there are no pending transactions'
        )
      }

      setBuildState({
        status: 'loading',
        message: 'Generating pending transactions',
      })

      const provider = new CannonWrapperGenericProvider(
        {},
        new ethers.providers.Web3Provider(fork),
        false
      )

      // Create a regsitry that loads data first from Memory to be able to utilize
      // the locally built data
      const fallbackRegistry = new FallbackRegistry([
        new InMemoryRegistry(),
        registry,
      ])
      const inMemoryLoader = new IPFSBrowserLoader(
        settings.ipfsUrl,
        fallbackRegistry
      )

      const {
        name,
        version,
        def,
        newState,
        simulatedTxs,
        runtime,
        skippedSteps,
      } = await build({
        chainId: chainId,
        provider,
        defaultSignerAddress: safeAddress,
        incompleteDeploy,
        loader: inMemoryLoader,
      })

      if (simulatedTxs.length === 0) {
        throw new Error(
          'There are no transactions that can be executed on Safe'
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

      setBuildState({
        status: 'loading',
        message: 'Uploading new build to IPFS',
      })

      const publishLoader = new IPFSBrowserLoader(settings.ipfsUrl, registry)

      const miscUrl = await publishLoader.putMisc(runtime.misc)

      const deployUrl = await publishLoader.putDeploy({
        def: def.toJson(),
        state: newState,
        options: incompleteDeploy.options,
        status: skippedSteps.length > 0 ? 'partial' : 'complete',
        meta: incompleteDeploy.meta,
        miscUrl,
      })

      if (!deployUrl) {
        throw new Error(
          `Could not upload build to IPFS node "${settings.ipfsUrl}"`
        )
      }

      const registryChainId = (await registry.provider.getNetwork()).chainId

      if (registryChainId === chainId) {
        setBuildState({
          status: 'loading',
          message: 'Preparing package for publication',
        })

        const tags = (settings.publishTags || '')
          .split(',')
          .map((t) => t.trim())
          .filter((t) => !!t)

        const publishData = createPublishData({
          packageName: name,
          variant: settings.preset,
          packageTags: [version, ...tags],
          packageVersionUrl: deployUrl,
          packageMetaUrl: miscUrl,
        })

        steps.push({
          name: 'Publish to registry',
          tx: {
            to: settings.registryAddress,
            value: '0',
            data: publishData,
          },
        })

        setBuildState({
          status: 'success',
          message:
            'Ready to stage! Click the button below to queue the transactions',
          url: deployUrl,
          steps,
          skipped: skippedSteps,
        })
      } else {
        setBuildState({
          status: 'success',
          message:
            'Done - Cannon Registry will not be updated because it is on a different network than the current Safe',
          url: deployUrl,
          steps,
          skipped: skippedSteps,
        })
      }
    } catch (err) {
      console.error(err)
      return setBuildState({ status: 'error', message: err.message })
    } finally {
      if (fork) await fork.disconnect()
    }
  }

  return startBuild
}

export function useCannonPackage(packageRef: string, variant = 'main') {
  return useQuery(['cannon', 'pkg', packageRef, variant], {
    queryFn: async () => {
      const registry = new OnChainRegistry({
        signerOrProvider: 'settings.registryProviderUrl',
        address: 'settings.registryAddress',
      })
      const loader = new IPFSBrowserLoader('settings.ipfsUrl', registry)

      const pkgUrl = await registry.getUrl(packageRef, variant)

      const deployInfo: DeploymentInfo = await loader.read(pkgUrl)

      if (deployInfo) {
        return deployInfo
      } else {
        throw new Error('package not found')
      }
    },
  })
}

export function useCannonContracts(packageRef: string, variant = 'main') {
  const deployInfoQuery = useCannonPackage(packageRef, variant)

  useEffect(() => {
    ;async () => {
      if (deployInfoQuery.data) {
        const info = deployInfoQuery.data

        const readRuntime = new ChainBuilderRuntime(
          {
            provider: p.provider,
            chainId: info.chainId || 1,
            getSigner: () => {
              return new Promise(() => {})
            },
            snapshots: false,
            allowPartialDeploy: false,
          },
          null,
          null
        )

        const outputs = await getOutputs(
          readRuntime,
          new ChainDefinition(info.def),
          info.state
        )
      }
    }
  }, [deployInfoQuery.data])
}
