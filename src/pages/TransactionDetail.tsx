import _ from 'lodash'
import { Address, isAddress, zeroAddress } from 'viem'
import { Button, Container, HStack, Text } from '@chakra-ui/react'
import { useContractWrite } from 'wagmi'
import { useNavigate, useParams } from 'react-router-dom'

import { SafeTransaction } from '../types'
import { TransactionDisplay } from '../components/TransactionDisplay'
import { useSafeTransactions, useTxnStager } from '../hooks/backend'

export function TransactionDetail() {
  let { safeAddress } = useParams()
  const { chainId, nonce } = useParams()

  const navigate = useNavigate()

  if (!isAddress(safeAddress)) {
    safeAddress = zeroAddress
  }

  const {
    nonce: safeNonce,
    staged,
    stagedQuery,
  } = useSafeTransactions({
    chainId: Number.parseInt(chainId),
    address: safeAddress as Address,
  })

  // get the txn we want, we can just pluck it out of staged transactions if its there
  let safeTxn: SafeTransaction | null = null
  if (parseInt(nonce) >= safeNonce && staged) {
    safeTxn = staged.find((s) => s.txn._nonce.toString() === nonce)?.txn || null
  }

  const stager = useTxnStager(safeTxn || {}, { onSignComplete: () => {
    navigate('/')
  }})
  const execTxn = useContractWrite(stager.executeTxnConfig)

  if (!safeTxn && stagedQuery.isFetched) {
    return (
      <Container>
        <Text>
          Transaction not found! Current safe nonce:{' '}
          {safeNonce ? safeNonce.toString() : 'none'}, Highest Staged Nonce:{' '}
          {_.last(staged)?.txn._nonce || 'none'}
        </Text>
      </Container>
    )
  }

  return (
    <Container maxW="100%" w="container.lg">
      <TransactionDisplay safeAddress={safeAddress} safeTxn={safeTxn} />
      <HStack
        marginTop="20px"
        w="container.sm"
        marginLeft={'auto'}
        marginRight={'auto'}
      >
        <Button
          w="100%"
          isDisabled={safeTxn && !stager.canSign}
          onClick={() => stager.sign()}
        >
          Sign
        </Button>
        <Button
          w="100%"
          isDisabled={safeTxn && !stager.canExecute}
          onClick={() => execTxn.write()}
        >
          Execute
        </Button>
      </HStack>
    </Container>
  )
}
