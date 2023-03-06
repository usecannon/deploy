import React, { useEffect, useState, useMemo } from 'react'
import { ethers } from 'ethers';
import {
  build,
  CannonWrapperGenericProvider,
  ChainBuilderRuntime,
  ChainDefinition,
  createInitialContext,
  IPFSLoader,
  OnChainRegistry
} from '@usecannon/builder'
import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk'
import { SafeAppProvider } from '@safe-global/safe-apps-provider';

// TODO: move to dynamic env bars
const registryProviderUrl = 'https://mainnet.infura.io/v3/4791c1745a1f44ce831e94be7f9e8bd7'
const registryAddress = '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba'

const IPFS_URL = 'https://usecannon.infura-ipfs.io'

class CannonSafeAppProvider extends SafeAppProvider {
  async request({ method, params }) {
    console.log('request:', { method, params }, 1)
    const res = await super.request({ method, params })
    console.log('request:', { method, params }, res)
    return res
  }

  send(...args: any[]): Promise<any> {
    console.log('send: ', args[0])
    return super.send(args[0], args[1]) as unknown as Promise<any>
  }
}

const Cannon = (): React.ReactElement => {
  const [deployStatus, setDeployStatus] = useState<string>('loading...')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const { safe, connected, sdk } = useSafeAppsSDK()
  const { chainId } = safe

  const web3Provider = useMemo(() => {
    const cannonProvider = new CannonSafeAppProvider(safe, sdk)
    return new ethers.providers.Web3Provider(cannonProvider)
  }, [sdk, safe]);

  // TODO: move to form inputs
  const preset = 'main'
  const packageUrl = '@ipfs:QmPUNRGSuZVGvsuYycH62c1tYzswtNQS1dViYHZavTXmhH'
  const upgradeFrom = '@ipfs:QmPASEogqe59LaLv5Htd95tzqPyM4e5yuC9qJJ4iA9sjtq' // 'synthetix:latest'

  const getDeploy = async () => {
    try {
      const registry = new OnChainRegistry({
        signerOrProvider: registryProviderUrl,
        address: registryAddress,
      })

      const loader = new IPFSLoader(IPFS_URL, registry)
      const previousDeploy = await loader.readDeploy(upgradeFrom, preset, chainId)
      const incompleteDeploy = await loader.readDeploy(packageUrl, preset, chainId)

      if (!incompleteDeploy) {
        throw new Error(`Package not found: ${packageUrl} (${chainId}-${preset})`)
      }

      if (!previousDeploy) {
        throw new Error(`Package not found: ${upgradeFrom} (${chainId}-${preset})`)
      }

      setDeployStatus(incompleteDeploy.status)

      // TODO: Check if the downloaded deployment is from the same chainId.
      // Cannon is not doing this for deployments loaded from @ipfs urls, but,
      // we are currently not saving the chainId on the metadata, so I'm not sure how could we do it.

      if (incompleteDeploy.status === 'complete') {
        return setErrorMessage('Current deployment is already deployed completely')
      }

      if (previousDeploy.status !== 'complete') {
        return setErrorMessage('Previous deployment is not deployed completely')
      }

      // TODO: check that the remaining steps to be executed do not depend on other not-executed steps
      // as this would cause an error (or only execute until it can)

      const provider = new CannonWrapperGenericProvider({}, web3Provider)

      const runtime = new ChainBuilderRuntime({
        provider,
        chainId,
        getSigner: async (addr: string) => provider.getSigner(addr),
        baseDir: null,
        snapshots: false,
        allowPartialDeploy: false,
        publicSourceCode: true,
      }, loader);

      await runtime.restoreMisc(previousDeploy.miscUrl);
      const def = new ChainDefinition(previousDeploy.def);

      const meta = {} // TODO: allow to add custom meta
      const resolvedSettings = Object.assign(previousDeploy.options ?? {}, incompleteDeploy.options);
      const initialCtx = await createInitialContext(def, meta, resolvedSettings);

      setDeployStatus('building...')
      const newState = await build(runtime, def, previousDeploy.state ?? {}, initialCtx);

      console.log({ newState })

      // TODO:
      //  1. publish newState on IPFS
      //  2. publish new package in the registry

      console.log('previousDeploy: ', previousDeploy)
      console.log('incompleteDeploy: ', incompleteDeploy)

      setDeployStatus('done!')
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (!chainId) return
    getDeploy()
  }, [chainId])

  if (!connected) return <p>Not connected to safe wallet</p>
  if (errorMessage) return <p>{errorMessage}</p>

  return (
    <div>
      <p>chainId: {chainId}</p>
      <p>Safe: {safe.safeAddress}</p>
      <p>Status: {deployStatus}</p>
    </div>
  )
}

export default Cannon
