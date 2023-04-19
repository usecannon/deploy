import { BaseTransaction } from '@safe-global/safe-apps-sdk'
import {
  CannonWrapperGenericProvider,
  FallbackRegistry,
  InMemoryRegistry,
  OnChainRegistry,
} from '@usecannon/builder'
import { EthereumProvider } from 'ganache'
import { ethers } from 'ethers'
import { useEffect, useState } from 'react'

import { IPFSBrowserLoader, parseIpfsHash } from '../utils/ipfs'
import { StepExecutionError, build, createPublishData } from '../utils/cannon'
import { TSettings } from './settings'
import { createFork } from '../utils/rpc'
import { useHistory } from './history'

type BuildState =
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
  settings: TSettings
}

const INITIAL_STATE = {
  status: 'idle',
  message: '',
} as BuildState

export function useCannonBuild() {
  const history = useHistory()
  const [buildState, setState] = useState(INITIAL_STATE)

  useEffect(() => {
    if (history.status === 'closed' || history.status === 'error') {
      setState({
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

    if (!props.url) return setState(INITIAL_STATE)

    setState({
      status: 'loading',
      message: 'Loading build...',
    })

    const cid = parseIpfsHash(props.url)

    if (!cid) {
      return setState({
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

      setState({
        status: 'loading',
        message: 'Loading deployment data',
      })

      // Load partial deployment from IPFS
      const incompleteDeploy = await loader.readDeploy(
        packageUrl,
        props.preset,
        props.chainId
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

      setState({
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

      setState({
        status: 'loading',
        message: 'Uploading new build to IPFS',
      })

      const publishLoader = new IPFSBrowserLoader(
        props.settings.publishIpfsUrl,
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

      const registryChainId = (await registry.provider.getNetwork()).chainId

      await history.add({
        id: parseIpfsHash(deployUrl),
        preset: props.preset,
        chainId: props.chainId,
        safeAddress: props.safeAddress,
      })

      if (registryChainId === props.chainId) {
        setState({
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

        setState({
          status: 'success',
          message:
            'Ready to stage! Click the button below to queue the transactions',
          url: deployUrl,
          steps,
          skipped: skippedSteps,
        })
      } else {
        setState({
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
      return setState({ status: 'error', message: err.message })
    } finally {
      if (fork) await fork.disconnect()
    }
  }

  return [buildState, startBuild] as const
}
