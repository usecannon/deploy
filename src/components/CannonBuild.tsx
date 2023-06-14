import {
  Container,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Text,
} from '@chakra-ui/react'
import { useEffect } from 'react'
import { useNetwork } from 'wagmi'

import { Alert } from '../components/Alert'
import { CIDInput } from '../components/CIDInput'
import { isIpfsUploadEndpoint, parseIpfsHash } from '../utils/ipfs'
import { useCannonBuild } from '../hooks/cannon'
import { useStore } from '../store'
import { validatePreset } from '../utils/cannon'

export function CannonBuild() {
  const network = useNetwork()
  const chainId = network.chain?.id

  const safeAddress = useStore((s) => s.safeAddress)
  const cid = useStore((s) => s.build.cid)
  const buildState = useStore((s) => s.build.buildState)

  const setBuild = useStore((s) => s.setBuild)

  const settings = useStore((s) => s.settings)

  const startBuild = useCannonBuild()

  const submitSafeTx = async () => {
    if (buildState.status !== 'success') return
    if (buildState.steps.length === 0) return

    try {
      const txs = buildState.steps.map((step) => step.tx)
      console.log({ txs })
      // Submit txs to Safe
      // await sdk.txs.send({ txs })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <>
      <CIDInput initialValue={cid} onChange={(cid) => setBuild({ cid })} />

      {['error', 'loading'].includes(buildState.status) && (
        <Alert status={buildState.status === 'error' ? 'error' : 'info'}>
          <Text>{buildState.message}</Text>
        </Alert>
      )}

      {/* {buildState.status === 'success' && buildState.steps.length > 0 && (
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
      )} */}
    </>
  )
}
