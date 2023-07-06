import { Box, Container, Heading } from '@chakra-ui/react'

import { Alert } from '../components/Alert'
import { Transaction } from '../components/Transaction'
import { useExecutedTransactions } from '../hooks/safe'
import { useSafeTransactions } from '../hooks/backend'
import { useStore } from '../store'

export function Transactions() {
  const currentSafe = useStore((s) => s.currentSafe)
  const { staged } = useSafeTransactions(currentSafe)
  const history = useExecutedTransactions(currentSafe)

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
              canSign
              canExecute
            />
          ))}
        {currentSafe && staged.length === 0 && (
          <Alert status="info">
            There are no transactions to be executed on the selected safe
          </Alert>
        )}
      </Box>
      {currentSafe && history.count > 0 && (
        <Box mb="6">
          <Heading size="md">Executed Transactions ({history.count})</Heading>
          {history.results.map((tx) => (
            <Transaction key={tx.safeTxHash} safe={currentSafe} tx={tx} />
          ))}
        </Box>
      )}
    </Container>
  )
}
