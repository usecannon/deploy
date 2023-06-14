import {
  Box,
  Container,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Input,
  Text,
} from '@chakra-ui/react'
import { useAccount, useNetwork } from 'wagmi'
import { useEffect } from 'react'

import { Alert } from '../components/Alert'
import { CIDInput } from '../components/CIDInput'
import { isIpfsUploadEndpoint, parseIpfsHash } from '../utils/ipfs'
import { useCannonBuild } from '../hooks/cannon'
import { useStore } from '../store'
import { validatePreset } from '../utils/cannon'

export function Build() {
  const { isDisconnected } = useAccount()
  const network = useNetwork()
  const chainId = network.chain?.id

  const safeAddress = useStore((s) => s.safeAddress)
  const cid = useStore((s) => s.build.cid)
  const preset = useStore((s) => s.build.preset)
  const buildState = useStore((s) => s.build.buildState)

  const setBuildState = useStore((s) => s.setBuildState)

  // const settings = useStore((s) => s.settings)
  const settings = {}

  const startBuild = useCannonBuild()

  // useEffect(() => {
  //   startBuild({
  //     url: cid,
  //     preset,
  //     chainId,
  //     safeAddress: safeAddress.split(':')[1],
  //     settings,
  //   })
  // }, [chainId, preset, cid, settings])

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

  if (isDisconnected) {
    return (
      <Container maxW="100%" w="container.sm">
        <Alert status="info">Connect you wallet first please</Alert>
      </Container>
    )
  }

  return (
    <Container maxW="100%" w="container.md">
      <HStack spacing="4" alignItems="start">
        <CIDInput
          initialValue={cid}
          onChange={(cid) => setBuildState({ cid })}
        />
        <FormControl w="150px">
          <FormLabel>Preset</FormLabel>
          <Input
            name="preset"
            value={preset}
            onChange={(evt) => setBuildState({ preset: evt.target.value })}
            isInvalid={!validatePreset(preset)}
            readOnly={buildState.status === 'loading'}
            required
          />
        </FormControl>
      </HStack>

      {['error', 'loading'].includes(buildState.status) && (
        <Alert variant={buildState.status === 'error' ? 'error' : 'default'}>
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
    </Container>
  )
}
