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

import { IPFSBrowserLoader, parseIpfsHash } from '../utils/ipfs'
import { StepExecutionError, build, createPublishData } from '../utils/cannon'
import { Store, useStore } from '../store'
import { createFork } from '../utils/rpc'
import { useHistory } from './history'
import { useQuery } from '@tanstack/react-query'

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
  url: string
  preset: string
  chainId: number
  safeAddress: string
  settings: Store['settings']
}

export function useCannonBuild() {
  const history = useHistory()
  const buildState = useStore((s) => s.buildState)
  const setBuildState = useStore((s) => s.setBuildState)

  useEffect(() => {
    if (history.status === 'closed' || history.status === 'error') {
      setBuildState({
        status: 'error',
        message:
          'Could not connect to local database, you can execute builds but they will not be saved in the history. This is probably caused by third party cookies being blocked by your browser.',
      })
    }
  }, [history.status])

  const startBuild = async (props: BuildProps) => {
    if (buildState.status === 'loading') {
      throw new Error('Cannot change url while another build is in progress')
    }

    if (!props.url) return setBuildState({ status: 'idle', message: '' })

    setBuildState({
      status: 'loading',
      message: 'Loading build...',
    })

    const cid = parseIpfsHash(props.url)

    if (!cid) {
      return setBuildState({
        status: 'error',
        message: 'Package url must have the format "@ipfs:Qm..."',
      })
    }

    const packageUrl = `@ipfs:${cid}`

    let fork: EthereumProvider
    try {
      fork = await createFork({
        url: props.settings.forkProviderUrl,
        chainId: props.chainId,
        impersonate: [props.safeAddress],
      }).catch((err) => {
        err.message = `Could not create local fork for build: ${err.message}`
        throw err
      })

      const registry = new OnChainRegistry({
        signerOrProvider: props.settings.registryProviderUrl,
        address: props.settings.registryAddress,
      })

      const loader = new IPFSBrowserLoader(props.settings.ipfsUrl, registry)

      setBuildState({
        status: 'loading',
        message: 'Loading deployment data',
      })

      // Load partial deployment from IPFS
      const incompleteDeploy = await loader.read(
        packageUrl
      )

      console.log('Deploy: ', incompleteDeploy)

      if (!incompleteDeploy) {
        throw new Error(
          `Package not found: ${packageUrl} (chainId: ${props.chainId} | preset: ${props.preset})`
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
        props.settings.ipfsUrl,
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
        chainId: props.chainId,
        provider,
        defaultSignerAddress: props.safeAddress,
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

      const publishLoader = new IPFSBrowserLoader(
        props.settings.ipfsUrl,
        registry
      )

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
          `Could not upload build to IPFS node "${props.settings.ipfsUrl}"`
        )
      }

      const registryChainId = (await registry.provider.getNetwork()).chainId

      await history.add({
        id: parseIpfsHash(deployUrl),
        preset: props.preset,
        chainId: props.chainId,
        safeAddress: props.safeAddress,
      })

      if (registryChainId === props.chainId) {
        setBuildState({
          status: 'loading',
          message: 'Preparing package for publication',
        })

        const tags = (props.settings.publishTags || '')
          .split(',')
          .map((t) => t.trim())
          .filter((t) => !!t)

        const publishData = createPublishData({
          packageName: name,
          variant: props.preset,
          packageTags: [version, ...tags],
          packageVersionUrl: deployUrl,
          packageMetaUrl: miscUrl,
        })

        steps.push({
          name: 'Publish to registry',
          tx: {
            to: props.settings.registryAddress,
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
      
      const pkgUrl = await registry.getUrl(packageRef, variant);

      const deployInfo: DeploymentInfo = await loader.read(pkgUrl);

      if (deployInfo) {
        return deployInfo;
      } else {
        throw new Error('package not found');
      }
    }
  })
}

export function useCannonContracts(packageRef: string, variant = 'main') {
  const deployInfoQuery = useCannonPackage(packageRef, variant);


  useEffect(() => {
    (async () => {
      if (deployInfoQuery.data) {
        const info = deployInfoQuery.data;

        const readRuntime = new ChainBuilderRuntime(
          {
            provider: p.provider,
            chainId: info.chainId || 1,
            getSigner: () => { return new Promise(() => {}) },
            snapshots: false,
            allowPartialDeploy: false,
          },
          null,
          null
        );
    
        const outputs = await getOutputs(readRuntime, new ChainDefinition(info.def), info.state);
      }
    })
  }, [deployInfoQuery.data])

}