import { Box, Container, Heading, Text } from '@chakra-ui/react'

import { ExecutedTransaction } from '../components/ExecutedTransaction'
import { SafeTransaction } from '../types'
import { Transaction } from '../components/Transaction'
import { useSafeTransactions } from '../hooks/backend'
import { useStore } from '../store'

export function Transactions() {
  const currentSafe = useStore((s) => s.currentSafe)
  const { staged, history } = useSafeTransactions(currentSafe)

  console.log('got staged', currentSafe, staged)
  console.log('history', currentSafe, history)

  return (
    <Container maxW="100%" w="container.sm">
      <Box mb="6">
        <Heading size="md" mb="2">
          Pending Transactions ({staged.length})
        </Heading>
        {currentSafe &&
          staged.map((tx) => (
            <Transaction
              key={JSON.stringify(tx.txn)}
              safe={currentSafe}
              tx={tx.txn}
            />
          ))}
      </Box>
      <Box mb="6">
        <Heading size="sm">Executed Transactions ({history.length})</Heading>
        {currentSafe &&
          history.map((tx) => (
            <ExecutedTransaction
              key={tx.transactionHash}
              safe={currentSafe}
              tx={tx}
            />
          ))}
      </Box>
    </Container>
  )
}
