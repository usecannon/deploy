import { ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Container,
  Wrap,
  WrapItem,
  Text,
  Code,
} from '@chakra-ui/react'
import { useAccount, useNetwork } from 'wagmi'

import { Alert } from '../components/Alert'
import { Settings, useSettingsValidation } from '../components/Settings'
import { Step, Stepper, useSteps } from '../components/Stepper'

export function Build() {
  const { activeStep, setActiveStep } = useSteps({
    index: 0,
    count: 2,
  })

  const validSettings = useSettingsValidation()
  const { isDisconnected } = useAccount()
  const network = useNetwork()
  const chainId = network.chain?.id

  if (isDisconnected) {
    return (
      <Container maxWidth="container.md">
        <Alert status="info">You must connect a wallet.</Alert>
      </Container>
    )
  }

  if (!chainId) {
    return (
      <Container maxWidth="container.md">
        <Alert status="error">Could not connect to chain id {chainId}.</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="container.md">
      <Text mb="8">
        If you use the Cannon CLI’s <Code>build</Code> command and it is unable
        to complete all of the necessary transactions, it will generate a
        "partial build" package on IPFS. Provide the IPFS hash and this tool to
        queue the remaining transactions on the Safe.
      </Text>

      <Stepper size="lg" index={activeStep} mb="6">
        <Step
          title="Settings"
          description="Setup configuration"
          onClick={() => setActiveStep(0)}
        />
        <Step
          title="Deploy"
          description="Select partial deployment"
          onClick={() => setActiveStep(1)}
        />
      </Stepper>
      {activeStep === 0 && (
        <>
          <Settings />
          <Wrap justify="end">
            <WrapItem>
              <Button
                variant="ghost"
                textAlign="right"
                isDisabled={!validSettings}
                onClick={() => setActiveStep(1)}
                rightIcon={<ArrowForwardIcon />}
              >
                Go to Deploy
              </Button>
            </WrapItem>
          </Wrap>
        </>
      )}
      <Box pb="35" />
    </Container>
  )
}
