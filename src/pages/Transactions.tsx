import { Box, Container, FormLabel } from '@chakra-ui/react'
import { Alert } from '../components/Alert'
import { Transaction } from '../components/Transaction'
import { useSafeTransactions } from '../hooks/backend'
import { useExecutedTransactions } from '../hooks/safe'
import { useStore } from '../store'

export function Transactions() {
  const currentSafe = useStore((s) => s.currentSafe)
  const { staged } = useSafeTransactions(currentSafe)
  const history = useExecutedTransactions(currentSafe)

  return (
    <Container maxW="container.md">
      <Box mb="10">
        <FormLabel mb="3">Queued Transactions</FormLabel>
        {currentSafe &&
          staged.map((tx) => (
            <Transaction
              key={JSON.stringify(tx.txn)}
              safe={currentSafe}
              tx={tx.txn}
            />
          ))}
        {currentSafe && staged.length === 0 && (
          <Alert status="info">
            There are no transactions queued on the selected safe.
          </Alert>
        )}
      </Box>
      {currentSafe && history.count > 0 && (
        <Box mb="6">
          <FormLabel mb="3">Executed Transactions</FormLabel>
          {history.results.map((tx) => (
            <Transaction key={tx.safeTxHash} safe={currentSafe} tx={tx} />
          ))}
        </Box>
      )}
    </Container>
  )
}
