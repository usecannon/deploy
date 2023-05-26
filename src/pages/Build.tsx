import {
  Badge,
  Button,
  Card,
  Collapse,
  Container,
  Grid,
  Spacer,
  Text,
} from '@nextui-org/react'
import { useEffect, useState } from 'react'
import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk'

import { Alert } from '../components/Alert'
import { Input } from '../components/Input'
import { isIpfsUploadEndpoint, parseIpfsHash } from '../utils/ipfs'
import { useCannonBuild } from '../hooks/cannon'
import { useStore } from '../store'
import { validatePreset } from '../utils/cannon'

export function Build() {
  const setState = useStore((s) => s.setState)

  const settings = useStore((s) => s.settings)
  const packageRef = useStore((s) => s.packageRef)
  const preset = useStore((s) => s.preset)
  const buildState = useStore((s) => s.buildState)
  const startBuild = useCannonBuild()

  const { safe, connected, sdk } = useSafeAppsSDK()
  const { chainId } = safe

  useEffect(() => {
    startBuild({
      url: packageRef,
      preset,
      chainId,
      safeAddress: safe.safeAddress,
      settings,
    })
  }, [chainId, preset, packageRef, settings])

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
    <Container xs>
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
            placeholder="@ipfs:Qm..."
            name="packageUrl"
            value={packageRef}
            valid={!packageRef || !!parseIpfsHash(packageRef)}
            onChange={(packageRef) => setState({ packageRef })}
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
            onChange={(preset) => setState({ preset })}
            readOnly={buildState.status === 'loading'}
            required
          />
        </Grid>
      </Grid.Container>

      <Spacer />

      {['error', 'loading'].includes(buildState.status) && (
        <Alert variant={buildState.status === 'error' ? 'error' : 'default'}>
          <Text>{buildState.message}</Text>
        </Alert>
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

          {!isIpfsUploadEndpoint(settings.ipfsUrl) && (
            <>
              <Alert variant="warning">
                <Text>
                  Looks like you configured an IPFS URL that is not running on
                  port 5001 nor is using the protocol https+ipfs://, which means
                  that the gateway is not compatible with uploading new files.
                  Are you sure you are using the correct ipfs node url?
                </Text>
              </Alert>
              <Spacer />
            </>
          )}

          <Button css={{ minWidth: '100%' }} onClick={submitSafeTx} size="lg">
            Queue Transactions ({buildState.steps.length})
          </Button>

          <Spacer />
        </>
      )}

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

          <Spacer />
        </>
      )}
    </Container>
  )
}
