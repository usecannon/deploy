import { useParams } from 'react-router-dom'
import { TransactionDisplay } from '../components/TransactionDisplay'
import { SafeTransaction } from '../types';
import { useSafeTransactions, useTxnStager } from '../hooks/backend';
import { Button, Container, HStack } from '@chakra-ui/react';
import { useContractWrite } from 'wagmi';

export function TransactionDetail() {

  const { chainId, safeAddress, nonce } = useParams()

  const { nonce: safeNonce, staged } = useSafeTransactions({ chainId, safeAddress, nonce });

  // get the txn we want, we can just pluck it out of staged transactions if its there
  let safeTxn: SafeTransaction|null = null
  if (parseInt(nonce) > safeNonce) {
    safeTxn = staged.find(s => s.txn._nonce.toString() === nonce).txn;
  }

  const stager = useTxnStager(safeTxn)
  const execTxn = useContractWrite(stager.executeTxnConfig)

  return <Container>
        <TransactionDisplay safeTxn={safeTxn} />
        <HStack>
          <Button
            w="100%"
            isDisabled={!stager.canSign}
            onClick={() => stager.sign()}
          >
            Sign
          </Button>
          <Button
            w="100%"
            isDisabled={!stager.canExecute}
            onClick={() => execTxn.write()}
          >
            Execute
          </Button>
        </HStack>
    </Container>
}
