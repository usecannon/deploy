import React, { useEffect, useState, useMemo } from 'react'
import { ethers } from 'ethers'
import {
  build,
  CannonWrapperGenericProvider,
  ChainBuilderRuntime,
  ChainDefinition,
  createInitialContext,
  DeploymentInfo,
  Events,
  IPFSLoader,
  OnChainRegistry,
} from '@usecannon/builder'
import { BaseTransaction } from '@safe-global/safe-apps-sdk'
import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk'
import { DebounceInput } from 'react-debounce-input'
import { ReadOnlySafeAppProvider, SkippedTransaction } from './utils/providers'
import { Settings } from './components/Settings'
import { TenderlySettings } from './utils/tenderly'

interface PendingStep {
  stepName: string
  params: {
    to: string
    data: string
  }
}

// TODO: move to dynamic env bars
const registryProviderUrl =
  'https://mainnet.infura.io/v3/4791c1745a1f44ce831e94be7f9e8bd7'
const registryAddress = '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba'

const IPFS_URL = 'https://ipfs.io'

// Partial deployment example
// const packageUrl = '@ipfs:QmWwRaryQk4AtFPTPFyFv9qTNEZTFzR5MZJHQZqgMc2KvU'

const defaultSettings = {
  tenderlyKey: '',
  tenderlyProject: '',
} satisfies TenderlySettings

const Cannon = (): React.ReactElement => {
  const [settings, setSettings] = useState<TenderlySettings>(defaultSettings)

  const [preset, setPreset] = useState('main')
  const [packageUrl, setPackageUrl] = useState('')
  const [pendingTxs, setPendingTxs] = useState<PendingStep[]>([])

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
  }, [sdk, safe])

  const registry = useMemo(
    () =>
      new OnChainRegistry({
        signerOrProvider: registryProviderUrl,
        address: registryAddress,
      }),
    [registryProviderUrl, registryAddress]
  )

  useEffect(() => {
    resetStatus()
    if (!chainId || !preset || !packageUrl) return
    loadPendingTransactions()
  }, [chainId, preset, packageUrl])

  useEffect(() => {
    console.log(settings)
  }, [settings])

  const resetStatus = () => {
    setDeployStatus('')
    setDeployErrorMessage('')
    setPendingTxs([])
  }

  const setError = (msg: string) => {
    setDeployStatus('')
    setDeployErrorMessage(msg)
  }

  const loadPendingTransactions = async () => {
    if (!packageUrl.startsWith('@ipfs:')) {
      return setError('Package url must have the format "@ipfs:aaa..."')
    }

    try {
      const loader = new IPFSLoader(IPFS_URL, registry)
      const incompleteDeploy = await loader.readDeploy(
        packageUrl,
        preset,
        chainId
      )

      console.log('Deploy: ', incompleteDeploy)

      if (!incompleteDeploy) {
        return setError(
          `Package not found: ${packageUrl} (chainId: ${chainId} | preset: ${preset})`
        )
      }

      if (incompleteDeploy.status === 'none') {
        return setError('Selected deployment is not initialized')
      }

      if (incompleteDeploy.status === 'complete') {
        return setError(
          'Selected deployment is already completed, there are no pending transactions'
        )
      }

      setDeployStatus(incompleteDeploy.status)

      const txs = await _getPendingTransactions({
        chainId,
        readOnlyProvider,
        incompleteDeploy,
        loader,
      })

      setPendingTxs(txs)

      // TODO:
      //  1. publish newState on IPFS
      //  2. publish new package in the registry

      setDeployStatus('done!')
    } catch (err) {
      console.error(err)
      return setError(err.message)
    }
  }

  const submitPendingTxs = async () => {
    if (pendingTxs.length === 0) return

    try {
      const txs = pendingTxs.map(({ params }) => ({
        to: params.to as string,
        value: '0',
        data: params.data as string,
      })) satisfies BaseTransaction[]

      await sdk.txs.send({ txs })
    } catch (err) {
      console.error(err)
    }
  }

  if (!connected) return <p>Not connected to safe wallet</p>

  return (
    <div>
      <h3>Current Safe</h3>
      <p>chainId: {chainId}</p>
      <p>Safe: {safe.safeAddress}</p>

      <Settings defaultValue={defaultSettings} onChange={setSettings} />

      <h2>Deployment</h2>
      <div>
        <label htmlFor="preset">Preset:</label>
        <DebounceInput
          name="preset"
          value={preset}
          onChange={(event) => setPreset(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="packageUrl">Package Url:</label>
        <DebounceInput
          name="packageUrl"
          value={packageUrl}
          onChange={(event) => setPackageUrl(event.target.value)}
        />
      </div>

      {deployErrorMessage && (
        <p style={{ color: 'red' }}>{deployErrorMessage}</p>
      )}
      {deployStatus && <p>Status: {deployStatus}</p>}
      {pendingTxs.length > 0 && (
        <div>
          <h3>Pending Transactions</h3>
          {pendingTxs.map((tx) => (
            <div key={tx.stepName}>
              <p>
                <strong>{tx.stepName}</strong>
              </p>
              <p>Data: {tx.params.data}</p>
            </div>
          ))}
          <p>
            <button onClick={submitPendingTxs}>Submit Transactions</button>
          </p>
        </div>
      )}
    </div>
  )
}

async function _getPendingTransactions({
  chainId,
  readOnlyProvider,
  incompleteDeploy,
  loader,
}: {
  chainId: number
  readOnlyProvider: ethers.providers.Web3Provider
  incompleteDeploy: DeploymentInfo
  loader: IPFSLoader
}) {
  const provider = readOnlyProvider as unknown as CannonWrapperGenericProvider

  const runtime = new ChainBuilderRuntime(
    {
      provider,
      chainId,
      getSigner: async (addr: string) => provider.getSigner(addr),
      baseDir: null,
      snapshots: false,
      allowPartialDeploy: true,
      publicSourceCode: true,
    },
    loader
  )

  await runtime.restoreMisc(incompleteDeploy.miscUrl)
  const def = new ChainDefinition(incompleteDeploy.def)

  const initialCtx = await createInitialContext(
    def,
    incompleteDeploy.meta,
    incompleteDeploy.options
  )

  const pendingTxs: PendingStep[] = []

  runtime.on(Events.SkipDeploy, (stepName: string, err: SkippedTransaction) => {
    if (!(err instanceof SkippedTransaction)) throw err

    pendingTxs.push({
      stepName,
      params: err.params[0],
    } as PendingStep)
  })

  await build(runtime, def, incompleteDeploy.state ?? {}, initialCtx)

  return pendingTxs
}

export default Cannon
