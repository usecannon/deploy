import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, Container, Wrap, WrapItem } from '@chakra-ui/react'
import { useAccount, useNetwork } from 'wagmi'

import { Alert } from '../components/Alert'
import { CannonBuild } from '../components/CannonBuild'
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
      <Container maxW="100%" w="container.sm">
        <Alert status="info">Connect you wallet first please</Alert>
      </Container>
    )
  }

  if (!chainId) {
    return (
      <Container maxW="100%" w="container.sm">
        <Alert status="error">Could not connect with ethereum network</Alert>
      </Container>
    )
  }

  return (
    <Container maxW="100%" w="container.md">
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
      {activeStep === 1 && <CannonBuild />}
      <Box pb="35" />
    </Container>
  )
}
