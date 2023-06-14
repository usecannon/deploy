import {
  Box,
  Step as ChakraStep,
  StepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
} from '@chakra-ui/react'

export { Stepper, useSteps } from '@chakra-ui/react'

export function Step({
  title,
  description,
  onClick,
}: {
  title: string
  description?: string
  onClick: () => void
}) {
  return (
    <ChakraStep onClick={onClick} cursor="pointer">
      <StepIndicator>
        <StepStatus
          complete={<StepIcon />}
          incomplete={<StepNumber />}
          active={<StepNumber />}
        />
      </StepIndicator>
      <Box flexShrink="0">
        <StepTitle>{title}</StepTitle>
        <StepDescription>{description}</StepDescription>
      </Box>
      <StepSeparator />
    </ChakraStep>
  )
}
