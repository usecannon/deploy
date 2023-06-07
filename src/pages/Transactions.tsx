import { Box, Container, Heading } from '@chakra-ui/react'
import { Transaction } from '../components/Transaction'

export function Transactions() {
  return (
    <Container maxW="100%" w="container.sm">
      <Box mb="6">
        <Heading size="sm">Queued Transactions</Heading>
        <Transaction />
      </Box>
      <Box mb="6">
        <Heading size="sm">Executed Transactions</Heading>
        <Transaction />
      </Box>
    </Container>
  )
}
