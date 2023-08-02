import { Box, Checkbox, Container, Flex, FormLabel } from '@chakra-ui/react'
import { Alert } from '../components/Alert'
import { Transaction } from '../components/Transaction'
import { useSafeTransactions } from '../hooks/backend'
import { useExecutedTransactions } from '../hooks/safe'
import { useStore } from '../store'
import { useState } from 'react'

export function Transactions() {
  const currentSafe = useStore((s) => s.currentSafe)
  const { staged } = useSafeTransactions(currentSafe)
  let history = useExecutedTransactions(currentSafe)
  const [isChecked, setIsChecked] = useState(false)

  const handleCheckboxChange = (e) => {
    setIsChecked(e.target.checked)
  }

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
          <Flex mb="3">
            <FormLabel mb={0}>Executed Transactions</FormLabel>
            <Checkbox
              size="sm"
              ml="auto"
              isChecked={isChecked}
              onChange={handleCheckboxChange}
            >
              Hide {'Safe{Wallet}'} Transactions
            </Checkbox>
          </Flex>
          {history.results.map((tx) => (
            <Transaction
              key={tx.safeTxHash}
              safe={currentSafe}
              tx={tx}
              hideExternal={isChecked}
            />
          ))}
        </Box>
      )}
    </Container>
  )
}
