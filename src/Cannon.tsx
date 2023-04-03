import React, { useEffect, useState } from 'react'
import { BaseTransaction } from '@safe-global/safe-apps-sdk'
import {
  Button,
  Card,
  Collapse,
  Dropdown,
  Grid,
  Input,
  Spacer,
  Text,
} from '@nextui-org/react'
import {
  CannonWrapperGenericProvider,
  OnChainRegistry,
} from '@usecannon/builder'
import { DebounceInput } from 'react-debounce-input'
import { ethers } from 'ethers'
import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk'

import {
  CannonTransaction,
  StepExecutionError,
  build,
  createPublishData,
} from './utils/cannon'
import { IPFSBrowserLoader } from './utils/browser-ipfs-loader'
import { TSettings } from './types'
import { createFork, deleteFork } from './utils/tenderly'

interface Props {
  settings: TSettings
}

const Cannon = ({ settings }: Props): React.ReactElement => {
  const [preset, setPreset] = useState('main')
  const [packageUrl, setPackageUrl] = useState('')
  const [simulatedCannonTxs, setSimulatedCannonTxs] = useState<
    CannonTransaction[]
  >([])
  const [safeTxs, setSafeTxs] = useState<BaseTransaction[]>([])
  const [skippedCannonSteps, setSkippedSteps] = useState<StepExecutionError[]>(
    []
  )

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
    setSimulatedCannonTxs([])
    setSafeTxs([])
    setSkippedSteps([])
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

      const loader = new IPFSBrowserLoader(settings.ipfsUrl, registry)

      setDeployStatus('Loading deployment data')

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

      const {
        name,
        version,
        def,
        newState,
        simulatedTxs,
        runtime,
        skippedSteps,
      } = await build({
        chainId,
        provider,
        defaultSignerAddress: safe.safeAddress,
        incompleteDeploy,
        loader,
      })

      const safeTxs: BaseTransaction[] = await Promise.all(
        simulatedTxs.map((tx) => provider.getTransaction(tx.hash))
      ).then((txs) =>
        txs.map((tx) => ({
          to: tx.to,
          value: tx.value.toString(),
          data: tx.data,
        }))
      )

      if (safeTxs.length === 0) {
        setSafeTxs(safeTxs)
        throw new Error('There are no transactions that can be executed')
      }

      setDeployStatus('Uploading to IPFS')

      const publishLoader = new IPFSBrowserLoader(
        settings.publishIpfsUrl,
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

      if (registryChainId === chainId) {
        setDeployStatus('Preparing package for publication')

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

        setSafeTxs([
          ...safeTxs,
          {
            to: settings.registryAddress,
            value: '0',
            data: publishData,
          },
        ])

        setDeployStatus(
          'Ready to stage! Click the button below to queue the transactions.'
        )
      } else {
        setDeployStatus(
          `Done - Cannon Registry will not be updated because it is on a different network - New package URL: ${deployUrl}`
        )
        setSafeTxs(safeTxs)
      }

      setSimulatedCannonTxs(simulatedTxs)
      setSkippedSteps(skippedSteps)
    } catch (err) {
      console.error(err)
      return setError(err.message)
    } finally {
      await deleteFork(settings, fork.id)
    }
  }

  const submitSafeTx = async () => {
    if (simulatedCannonTxs.length === 0) return

    try {
      const txs = safeTxs
      await sdk.txs.send({ txs })
    } catch (err) {
      console.error(err)
    }
  }

  if (!connected) return <p>Not connected to safe wallet</p>

  return (
    <>
      <Card css={{ paddingLeft: '0.8em', paddingRight: '0.8em' }}>
        <Card.Body>
          <Grid.Container>
            <Grid xs={9} direction="column">
              <Text h5 css={{ margin: 0 }}>
                Connected Safe Address
              </Text>
              <Text>{safe.safeAddress}</Text>
            </Grid>
            <Grid xs direction="column">
              <Text h5 css={{ margin: 0 }}>
                Chain ID
              </Text>
              <Text>{chainId}</Text>
            </Grid>
          </Grid.Container>
        </Card.Body>
      </Card>

      <Spacer y={1.5} />

      <Text h3>Stage Cannon Deployment</Text>
      <Text>
        Enter the IPFS URL for a partial Cannon deployment. You can preview the
        incomplete transactions and queue them to the connected safe.
      </Text>

      <Spacer y={1.5} />

      <Grid.Container>
        <Grid xs={9} direction="column">
          <Input
            bordered
            label="Partial Cannon Deployment IPFS URL"
            placeholder='e.g. "@ipfs:Qm..."'
            name="packageUrl"
            value={packageUrl}
            onChange={(event) => setPackageUrl(event.target.value)}
          />
        </Grid>
        <Grid xs direction="column" css={{ marginLeft: '1em' }}>
          <Input
            bordered
            label="Preset"
            name="preset"
            value={preset}
            onChange={(event) => setPreset(event.target.value)}
          />
        </Grid>
      </Grid.Container>

      {deployErrorMessage && (
        <p style={{ color: 'red' }}>{deployErrorMessage}</p>
      )}

      <Spacer />

      {deployStatus && (
        <Card>
          <Card.Body css={{ padding: '.6em' }}>
            <Grid.Container>
              <Grid
                css={{ marginRight: '.4em', transform: 'translateY(2.5px)' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="rgba(255, 255, 255, 0.5)"
                >
                  <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path>
                  <path d="M11 11h2v6h-2zm0-4h2v2h-2z"></path>
                </svg>
              </Grid>
              <Grid xs={10}>
                <Text>{deployStatus}</Text>
              </Grid>
            </Grid.Container>
          </Card.Body>
        </Card>
      )}
      <Spacer />

      {simulatedCannonTxs.length > 0 && (
        <>
          <Collapse.Group css={{ padding: 0 }}>
            {simulatedCannonTxs.map((tx, i) => (
              <Collapse key={tx.hash} title={tx.deployedOn}>
                <Text>Data: {safeTxs[i].data}</Text>
              </Collapse>
            ))}
          </Collapse.Group>
          <Spacer />
          <Button css={{ minWidth: '100%' }} onClick={submitSafeTx} size="lg">
            Queue Transactions
          </Button>
        </>
      )}
      <Spacer />

      {skippedCannonSteps.length > 0 && (
        <>
          <Text h3>Skipped Transactions</Text>
          <Text>
            Enter the IPFS URL for a partial Cannon deployment. You can preview
            the incomplete transactions and queue them to the connected safe.
          </Text>
          <Collapse.Group css={{ padding: 0 }}>
            {skippedCannonSteps.map(({ stepName, err }) => (
              <Collapse key={stepName} title={stepName}>
                <Text>{err.message}</Text>
              </Collapse>
            ))}
          </Collapse.Group>
        </>
      )}
    </>
  )
}

export default Cannon
