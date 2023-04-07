import React, { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Collapse,
  Grid,
  Spacer,
  Text,
} from '@nextui-org/react'
import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk'

import { ExclamationIcon } from '../components/ExclamationIcon'
import { Input } from '../components/Input'
import { TSettings } from '../hooks/settings'
import { parseIpfsHash } from '../utils/ipfs'
import { useCannonBuild } from '../hooks/cannon'
import { validatePreset } from '../utils/cannon'

interface Props {
  settings: TSettings
}

export function Cannon({ settings }: Props) {
  const [buildState, startBuild] = useCannonBuild()
  const [preset, setPreset] = useState('main')
  const [packageUrl, setPackageUrl] = useState('')

  const { safe, connected, sdk } = useSafeAppsSDK()
  const { chainId } = safe

  useEffect(() => {
    startBuild({
      url: packageUrl,
      preset,
      chainId,
      safeAddress: safe.safeAddress,
      settings,
    })
  }, [chainId, preset, packageUrl, settings])

  const submitSafeTx = async () => {
    if (buildState.status !== 'success') return
    if (buildState.steps.length === 0) return

    try {
      const txs = buildState.steps.map((step) => step.tx)
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
            label="Partial Cannon Deployment IPFS URL"
            placeholder='e.g. "@ipfs:Qm..."'
            name="packageUrl"
            value={packageUrl}
            valid={!packageUrl || !!parseIpfsHash(packageUrl)}
            onChange={setPackageUrl}
            readOnly={buildState.status === 'loading'}
            required
          />
        </Grid>
        <Grid xs direction="column" css={{ marginLeft: '1em' }}>
          <Input
            label="Preset"
            name="preset"
            value={preset}
            valid={validatePreset(preset)}
            onChange={setPreset}
            readOnly={buildState.status === 'loading'}
            required
          />
        </Grid>
      </Grid.Container>

      <Spacer />

      {buildState.status === 'error' && (
        <Card variant="bordered" css={{ bg: '$error' }}>
          <Card.Body css={{ padding: '.6em' }}>
            <Text>{buildState.message}</Text>
          </Card.Body>
        </Card>
      )}

      {buildState.status === 'loading' && (
        <Card>
          <Card.Body css={{ padding: '.6em' }}>
            <Grid.Container>
              <Grid
                css={{ marginRight: '.4em', transform: 'translateY(2.5px)' }}
              >
                <ExclamationIcon />
              </Grid>
              <Grid xs={10}>
                <Text>{buildState.message}</Text>
              </Grid>
            </Grid.Container>
          </Card.Body>
        </Card>
      )}
      <Spacer />

      {buildState.status === 'success' && buildState.steps.length > 0 && (
        <>
          <Collapse.Group css={{ padding: 0 }}>
            {buildState.steps.map((step, i) => (
              <Collapse key={i} title={step.name}>
                <Text>Data: {step.tx.data}</Text>
              </Collapse>
            ))}
          </Collapse.Group>
          <Spacer />
          <Button css={{ minWidth: '100%' }} onClick={submitSafeTx} size="lg">
            Queue Transactions ({buildState.steps.length})
          </Button>
        </>
      )}
      <Spacer />

      {buildState.status === 'success' && buildState.skipped.length > 0 && (
        <>
          <Text h3>
            Skipped Transactions&nbsp;
            <Badge color="error">{buildState.skipped.length}</Badge>
          </Text>
          <Text>
            The following steps will not be queued skipped because they could
            not be executed by the Safe when simulating the deployment.
          </Text>
          <Collapse.Group css={{ padding: 0 }}>
            {buildState.skipped.map(({ name: stepName, err }) => (
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
