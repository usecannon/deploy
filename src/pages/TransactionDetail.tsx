import _ from 'lodash'
import { Address, isAddress, zeroAddress } from 'viem'
import {
  Button,
  Container,
  HStack,
  Text,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Tooltip,
} from '@chakra-ui/react'
import { useContractWrite } from 'wagmi'
import { useNavigate, useParams } from 'react-router-dom'

import { SafeTransaction } from '../types'
import { TransactionDisplay } from '../components/TransactionDisplay'
import { useSafeTransactions, useTxnStager } from '../hooks/backend'
import { getSafeTransactionHash } from '../utils/safe'

export function TransactionDetail() {
  let { safeAddress } = useParams()
  const { chainId, nonce, sigHash } = useParams()

  const navigate = useNavigate()

  if (!isAddress(safeAddress)) {
    safeAddress = zeroAddress
  }

  const {
    nonce: safeNonce,
    staged,
    stagedQuery,
  } = useSafeTransactions({
    chainId: Number.parseInt(chainId) as any,
    address: safeAddress as Address,
  })

  // get the txn we want, we can just pluck it out of staged transactions if its there
  let safeTxn: SafeTransaction | null = null
  if (parseInt(nonce) >= safeNonce && staged) {
    safeTxn =
      staged.find(
        (s) =>
          s.txn._nonce.toString() === nonce &&
          (!sigHash ||
            sigHash ===
              getSafeTransactionHash(
                { address: safeAddress as Address, chainId: chainId as any },
                s.txn
              ))
      )?.txn || null
  }

  const stager = useTxnStager(safeTxn || {}, {
    safe: {
      chainId: parseInt(chainId) as any,
      address: safeAddress as Address,
    },
    onSignComplete: () => {
      navigate('/')
    },
  })
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
    <Container maxW="100%" w="container.lg" pb="12">
      <Heading size="lg" mb="3">
        Transaction #{nonce}
      </Heading>

      <FormControl mb="3">
        <FormLabel mb="0.5">Safe</FormLabel>
        <Input
          variant="unstyled"
          isReadOnly
          value={`${safeAddress} (Chain ID: ${chainId})`}
        />
      </FormControl>

      <TransactionDisplay
        safe={{address: safeAddress as Address, chainId: parseInt(chainId)}}
        safeTxn={safeTxn}
        verify={true}
      />
      <HStack gap="6" marginTop="20px" marginLeft={'auto'} marginRight={'auto'}>
        <Tooltip label={stager.signConditionFailed}>
          <Button
            size="lg"
            w="100%"
            isDisabled={safeTxn && !!stager.signConditionFailed}
            onClick={() => stager.sign()}
          >
            Sign
          </Button>
        </Tooltip>
        <Tooltip label={stager.execConditionFailed}>
          <Button
            size="lg"
            w="100%"
            isDisabled={safeTxn && !!stager.execConditionFailed}
            onClick={() => execTxn.write()}
          >
            Execute
          </Button>
        </Tooltip>
      </HStack>
    </Container>
  )
}
