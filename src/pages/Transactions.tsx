import { Box, Container, Heading } from '@chakra-ui/react'

import { Transaction } from '../components/Transaction'
import { usePendingTransactions } from '../hooks/safe'
import { useStore } from '../store'
import { useSafeTransactions } from '../hooks/backend'

export function Transactions() {
  const safeAddress = useStore((s) => s.safeAddress)
  const {staged} = useSafeTransactions()

  return (
    <Container maxW="100%" w="container.sm">
      <Box mb="6">
        <Heading size="sm">
          Pending Transactions ({staged.length})
        </Heading>
        {safeAddress &&
          staged.map((tx) => (
            <Transaction
              key={JSON.stringify(tx.txn)}
              safeAddress={safeAddress}
              tx={tx.txn}
            />
          ))}
      </Box>
      {/* <Box mb="6">
        <Heading size="sm">Executed Transactions</Heading>
        <Transaction />
      </Box> */}
    </Container>
  )
}
