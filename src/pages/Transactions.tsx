import { Box, Container, Heading } from '@chakra-ui/react'

import { Transaction } from '../components/Transaction'
import { usePendingTransactions } from '../hooks/safe'
import { useStore } from '../store'

export function Transactions() {
  const safeAddress = useStore((s) => s.safeAddress)
  const pendingTransactions = usePendingTransactions(safeAddress)

  console.log('pendingTransactions', pendingTransactions)

  return (
    <Container maxW="100%" w="container.sm">
      <Box mb="6">
        <Heading size="sm">
          Pending Transactions ({pendingTransactions.length})
        </Heading>
        {pendingTransactions.map((tx) => (
          <Transaction key={tx.safeTxHash} safeAddress={safeAddress} tx={tx} />
        ))}
      </Box>
      {/* <Box mb="6">
        <Heading size="sm">Executed Transactions</Heading>
        <Transaction />
      </Box> */}
    </Container>
  )
}
