import React, { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import {
  CannonWrapperGenericProvider,
  IPFSLoader,
  OnChainRegistry,
} from '@usecannon/builder'
import { BaseTransaction } from '@safe-global/safe-apps-sdk'
import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk'
import { DebounceInput } from 'react-debounce-input'
import { Settings, SettingsValues } from './components/Settings'
import { createFork, deleteFork } from './utils/tenderly'
import { CannonTransaction, build, createPublishData } from './utils/cannon'

// Partial deployment example
// const packageUrl = '@ipfs:QmWwRaryQk4AtFPTPFyFv9qTNEZTFzR5MZJHQZqgMc2KvU'

// Strcuture of components settings, with its default values
const defaultSettings = {
  tenderlyKey: '',
  tenderlyProject: '',
  publishIpfsUrl: '',
  ipfsUrl: 'https://ipfs.io',
  registryAddress: '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba',
  registryProviderUrl:
    'https://mainnet.infura.io/v3/4791c1745a1f44ce831e94be7f9e8bd7',
  publishTags: 'latest',
} satisfies SettingsValues

const Cannon = (): React.ReactElement => {
  const [settings, setSettings] =
    useState<typeof defaultSettings>(defaultSettings)

  const [preset, setPreset] = useState('main')
  const [packageUrl, setPackageUrl] = useState('')
  const [pendingCannonTxs, setPendingCannonTxs] = useState<CannonTransaction[]>(
    []
  )
  const [pendingTxs, setPendingTxs] = useState<BaseTransaction[]>([])

  const [deployStatus, setDeployStatus] = useState('loading...')
  const [deployErrorMessage, setDeployErrorMessage] = useState('')

  const { safe, connected, sdk } = useSafeAppsSDK()
  const { chainId } = safe

  useEffect(() => {
    resetStatus()
    if (!chainId || !preset || !packageUrl) return
    loadPendingTransactions()
  }, [chainId, preset, packageUrl])

  const resetStatus = () => {
    setDeployStatus('')
    setDeployErrorMessage('')
    setPendingCannonTxs([])
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

    const fork = await createFork(settings, chainId)

    try {
      const registry = new OnChainRegistry({
        signerOrProvider: settings.registryProviderUrl,
        address: settings.registryAddress,
      })

      const loader = new IPFSLoader(
        settings.ipfsUrl.replace(/\/$/, ''),
        registry
      )

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

      setDeployStatus('Generating deploy transactions')

      const provider = new CannonWrapperGenericProvider(
        {},
        new ethers.providers.JsonRpcProvider(fork.json_rpc_url)
      )

      const { name, version, def, newState, executedTxs, runtime } =
        await build({
          chainId,
          provider,
          incompleteDeploy,
          loader,
        })

      const pendingTxs: BaseTransaction[] = await Promise.all(
        executedTxs.map((tx) => provider.getTransaction(tx.hash))
      ).then((txs) =>
        txs.map((tx) => ({
          to: tx.to,
          value: tx.value.toString(),
          data: tx.data,
        }))
      )

      const registryChainId = (await registry.provider.getNetwork()).chainId

      if (registryChainId === chainId) {
        setDeployStatus('Preparing package for publication')

        const publishLoader = new IPFSLoader(
          settings.publishIpfsUrl.replace(/\/$/, ''),
          registry
        )

        const miscUrl = await publishLoader.putMisc(runtime.misc)

        const deployUrl = await publishLoader.putDeploy({
          def: def.toJson(),
          state: newState,
          options: incompleteDeploy.options,
          status: 'complete',
          meta: incompleteDeploy.meta,
          miscUrl,
        })

        const tags = (settings.publishTags || '')
          .split(',')
          .map((t) => t.trim())
          .filter((t) => !!t)

        const publishData = createPublishData({
          packageName: name,
          variant: preset,
          packageTags: [version, ...tags],
          packageVersionUrl: deployUrl,
          packageMetaUrl: miscUrl,
        })

        setPendingTxs([
          ...pendingTxs,
          {
            to: settings.registryAddress,
            value: '0',
            data: publishData,
          },
        ])
      } else {
        setDeployStatus('Done - Registry will not be updated')
        setPendingTxs(pendingTxs)
      }

      setPendingCannonTxs(executedTxs)

      // TODO:
      //  1. publish newState on IPFS
      //  2. publish new package in the registry
    } catch (err) {
      console.error(err)
      return setError(err.message)
    } finally {
      await deleteFork(settings, fork.id)
    }
  }

  const submitPendingTxs = async () => {
    if (pendingCannonTxs.length === 0) return

    try {
      const txs = pendingTxs
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

      <Settings
        defaultValue={defaultSettings}
        onChange={(v) => {
          setSettings(v)
        }}
      />

      <h2>Deployment</h2>
      <div>
        <label htmlFor="preset">Preset:&nbsp;</label>
        <DebounceInput
          name="preset"
          value={preset}
          onChange={(event) => setPreset(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="packageUrl">Package Url:&nbsp;</label>
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
      {pendingCannonTxs.length > 0 && (
        <div>
          <h3>Pending Transactions</h3>
          {pendingCannonTxs.map((tx, i) => (
            <div key={tx.hash}>
              <p>
                <strong>{tx.deployedOn}</strong>
              </p>
              <p>Data: {pendingTxs[i].data}</p>
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

export default Cannon
