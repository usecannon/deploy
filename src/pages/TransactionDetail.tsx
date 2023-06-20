import _ from 'lodash'
import { useParams } from 'react-router-dom'
import { TransactionDisplay } from '../components/TransactionDisplay'
import { SafeTransaction } from '../types';
import { useSafeTransactions, useTxnStager } from '../hooks/backend';
import { Button, Text, Container, HStack } from '@chakra-ui/react';
import { useContractWrite } from 'wagmi';
import { Address, isAddress, zeroAddress } from 'viem';

export function TransactionDetail() {

  let { chainId, safeAddress, nonce } = useParams()

  if (!isAddress(safeAddress)) {
    safeAddress = zeroAddress
  }

  const { nonce: safeNonce, staged, stagedQuery } = useSafeTransactions({ chainId, safeAddress: safeAddress as Address });

  // get the txn we want, we can just pluck it out of staged transactions if its there
  let safeTxn: SafeTransaction|null = null
  if (parseInt(nonce) >= safeNonce && staged) {
    safeTxn = staged.find(s => s.txn._nonce.toString() === nonce)?.txn || null;
  }

  const stager = useTxnStager(safeTxn || {})
  const execTxn = useContractWrite(stager.executeTxnConfig)


  if (!safeTxn && stagedQuery.isFetched) {
    return <Container>
      <Text>Transaction not found! Current safe nonce: {safeNonce ? safeNonce.toString() : 'none'}, Highest Staged Nonce: {_.last(staged)?.txn._nonce || 'none'}</Text>
    </Container>
  }

  return <Container maxW="100%" w='container.lg'>
        <TransactionDisplay safeTxn={safeTxn} />
        <HStack marginTop='20px' w='container.sm' marginLeft={'auto'} marginRight={'auto'}>
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
}
