import { Box, Container, Heading, Text } from '@chakra-ui/react'

import { Transaction } from '../components/Transaction'
import { useSafeTransactions } from '../hooks/backend'
import { useStore } from '../store'

export function Transactions() {
  const safeAddress = useStore((s) => s.safeAddresses[s.safeIndex]?.address)
  const chainId = useStore((s) => s.safeAddresses[s.safeIndex]?.chainId)
  const { staged } = useSafeTransactions()

  return (
    <Container maxW="100%" w="container.sm">
      <Box mb="6">
        <Text mb="8">
          The following transactions have been queued for execution by the
          selected Safe. Signatures submitted for these transaction are stored
          on a seperate microservice from the official Gnosis Safe web
          application.
        </Text>
        <Heading size="md" mb="2">
          Pending Transactions ({staged.length})
        </Heading>
        {safeAddress &&
          staged.map((tx) => (
            <Transaction
              key={JSON.stringify(tx.txn)}
              safeAddress={safeAddress}
              chainId={chainId}
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
