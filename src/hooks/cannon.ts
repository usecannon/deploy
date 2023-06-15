import { BaseTransaction } from '@safe-global/safe-apps-sdk'
import _ from 'lodash';
import {
  CannonWrapperGenericProvider,
  ChainArtifacts,
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
import { useEffect, useState } from 'react'
import { useChainId, useNetwork } from 'wagmi'
import { useQuery } from '@tanstack/react-query'

import { IPFSBrowserLoader, parseIpfsHash } from '../utils/ipfs'
import { StepExecutionError, build, createPublishData } from '../utils/cannon'
import { useStore } from '../store'
import { createFork } from '../utils/rpc'

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
    s.safeAddress ? s.safeAddress.split(':')[1] : ''
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

      const miscUrl = await publishLoader.put(runtime.misc)

      const deployUrl = await publishLoader.put({
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

export function useCannonPackage(packageRef: string, variant = '') {

  const chainId = useChainId();

  if (!variant) {
    variant = `${chainId}-main`;
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

      if (!pkgUrl) {
        return null
      }

      const loader = new IPFSBrowserLoader(settings.ipfsUrl, null)

      const deployInfo: DeploymentInfo = await loader.read(pkgUrl)

      if (deployInfo) {
        return deployInfo
      } else {
        throw new Error('failed to download package data')
      }
    },
  })

  return {
    registryQuery,
    ipfsQuery,
    pkgUrl,
    pkg: ipfsQuery.data
  }
}

type ContractInfo = {
  [x: string]: { address: string, abi: any[] };
}

export function getContractsRecursive(
  outputs: ChainArtifacts,
  signerOrProvider: ethers.Signer | ethers.providers.Provider,
  prefix?: string
): ContractInfo {
  let contracts = _.mapValues(outputs.contracts, (ci) => {
    return { address: ci.address, abi: ci.abi };
  });
  if (prefix) {
    contracts = _.mapKeys(contracts, (_, contractName) => `${prefix}.${contractName}`);
  }
  for (const [importName, importOutputs] of Object.entries(outputs.imports || {})) {
    const newContracts = getContractsRecursive(importOutputs, signerOrProvider, importName);
    contracts = { ...contracts, ...newContracts };
  }
  return contracts;
}


export function useCannonPackageContracts(packageRef: string, variant = '') {
  const pkg = useCannonPackage(packageRef, variant)
  const [contracts, setContracts] = useState<ContractInfo|null>(null);

  useEffect(() => {
    const getContracts = async () => {
      if (pkg.pkg) {
        const info = pkg.pkg

        const readRuntime = new ChainBuilderRuntime(
          {
            provider: null,
            chainId: 1,
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
        );

        setContracts(getContractsRecursive(outputs, null));
      }
    }

    getContracts();
  }, [pkg.pkg])

  return { contracts, ...pkg }
}
