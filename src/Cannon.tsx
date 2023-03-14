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
import { BaseTransaction } from '@safe-global/safe-apps-sdk'
import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk'
import { SafeAppProvider } from '@safe-global/safe-apps-provider';
import { DebounceInput } from 'react-debounce-input';
import { ReadOnlySafeAppProvider } from './utils/providers';

// TODO: move to dynamic env bars
const registryProviderUrl = 'https://mainnet.infura.io/v3/4791c1745a1f44ce831e94be7f9e8bd7'
const registryAddress = '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba'

const IPFS_URL = 'https://usecannon.infura-ipfs.io'

// Partial deployment example
// const packageUrl = '@ipfs:QmWwRaryQk4AtFPTPFyFv9qTNEZTFzR5MZJHQZqgMc2KvU'

const Cannon = (): React.ReactElement => {
  const [preset, setPreset] = useState('main')
  const [packageUrl, setPackageUrl] = useState('')

  const [deployStatus, setDeployStatus] = useState('loading...')
  const [deployErrorMessage, setDeployErrorMessage] = useState('')

  const { safe, connected, sdk } = useSafeAppsSDK()
  const { chainId } = safe

  // const web3Provider = useMemo(() => {
  //   const cannonProvider = new SafeAppProvider(safe, sdk)
  //   return new ethers.providers.Web3Provider(cannonProvider)
  // }, [sdk, safe]);

  const readOnlyProvider = useMemo(() => {
    const cannonProvider = new ReadOnlySafeAppProvider(safe, sdk)
    return new ethers.providers.Web3Provider(cannonProvider)
  }, [sdk, safe]);

  const registry = useMemo(() => new OnChainRegistry({
    signerOrProvider: registryProviderUrl,
    address: registryAddress,
  }), [registryProviderUrl, registryAddress]);

  const getDeployPendingTransactions = async () => {
    if (!packageUrl.startsWith('@ipfs:')) {
      setDeployStatus('')
      setDeployErrorMessage(`Package url must have the format "@ipfs:aaa..."`)
      return
    }

    try {
      const loader = new IPFSLoader(IPFS_URL, registry)
      const incompleteDeploy = await loader.readDeploy(packageUrl, preset, chainId)

      console.log('Deploy: ', incompleteDeploy)

      if (!incompleteDeploy) {
        throw new Error(`Package not found: ${packageUrl} (${chainId}-${preset})`)
      }

      if (incompleteDeploy.status === 'none') {
        return setDeployErrorMessage('Selected deployment is not initialized')
      }

      if (incompleteDeploy.status === 'complete') {
        return setDeployErrorMessage('Selected deployment is already completed, it has no pending transactions')
      }

      setDeployStatus(incompleteDeploy.status)

      // TODO: Check if the downloaded deployment is from the same chainId.
      // Cannon is not doing this for deployments loaded from @ipfs urls, but,
      // we are currently not saving the chainId on the metadata, so I'm not sure how could we do it.

      // TODO: check that the remaining steps to be executed do not depend on other not-executed steps
      // as this would cause an error (or only execute until it can)

      // const provider = new CannonWrapperGenericProvider({}, web3Provider)
      const provider = web3Provider as unknown as CannonWrapperGenericProvider

      const runtime = new ChainBuilderRuntime({
        provider,
        chainId,
        getSigner: async (addr: string) => provider.getSigner(addr),
        baseDir: null,
        snapshots: false,
        allowPartialDeploy: true,
        publicSourceCode: true,
      }, loader);

      await runtime.restoreMisc(incompleteDeploy.miscUrl);
      const def = new ChainDefinition(incompleteDeploy.def);

      const initialCtx = await createInitialContext(def, incompleteDeploy.meta, incompleteDeploy.options);

      setDeployStatus('building...')
      // const newState = await build(runtime, def, incompleteDeploy.state ?? {}, initialCtx);

      // console.log('newState: ', newState)

      // TODO:
      //  1. publish newState on IPFS
      //  2. publish new package in the registry

      setDeployStatus('done!')
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    setDeployErrorMessage('')
    setDeployStatus('')

    if (!chainId || !preset || !packageUrl) return

    getDeployPendingTransactions()
  }, [chainId, preset, packageUrl])

  if (!connected) return <p>Not connected to safe wallet</p>

  return (
    <div>
      <h3>Current Safe</h3>
      <p>chainId: {chainId}</p>
      <p>Safe: {safe.safeAddress}</p>

      <h2>Deployment</h2>
      <div>
        <label htmlFor='preset'>Preset:</label>
        <DebounceInput
          name='preset'
          defaultValue={'main'}
          value={preset}
          onChange={event => setPreset(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor='packageUrl'>Package Url:</label>
        <DebounceInput
          name='packageUrl'
          defaultValue={''}
          value={packageUrl}
          onChange={event => setPackageUrl(event.target.value)}
        />
      </div>

      {deployErrorMessage && <p style={{color: 'red'}}>{deployErrorMessage}</p>}
      {deployStatus && <p>Status: {deployStatus}</p>}
    </div>
  )
}

export default Cannon
