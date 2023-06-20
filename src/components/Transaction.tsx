import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import { CheckIcon } from '@chakra-ui/icons'
import { Link } from 'react-router-dom'
import { SafeMultisigTransactionListResponse } from '@safe-global/api-kit'

import { SafeTransaction } from '../types'
import { TransactionDisplay } from '../components/TransactionDisplay'
import { getSafeChain } from '../hooks/safe'

interface Params {
  safeAddress: string
  chainId: number
  tx: SafeTransaction
  modalDisplay?: boolean
  canSign?: boolean
  canExecute?: boolean
}

export function Transaction({
  safeAddress,
  chainId,
  tx,
  modalDisplay = false,
  canSign = false,
  canExecute = false,
}: Params) {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <Flex
      my="3"
      p="3"
      border="1px solid"
      borderColor="gray.500"
      borderRadius="md"
      alignItems="center"
    >
      <Box alignContent={'center'}>
        <Text>{chainId}</Text>
        <Heading size="md">Transaction #{tx._nonce}</Heading>
      </Box>
      {modalDisplay ? (
        <>
          <Button onClick={onOpen} ml="auto">
            Review & {canExecute ? 'Execute' : 'Queue'}
          </Button>

          <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Transaction Info</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <TransactionDisplay />
              </ModalBody>
            </ModalContent>
          </Modal>
        </>
      ) : (
        <Box ml="auto">
          <Link to={`/txn/${chainId}/${safeAddress}/${tx._nonce}`}>
            <Button>
              Details
              {/* Should link to pages/Transaction at /txn/chainId/txId */}
            </Button>
          </Link>
        </Box>
      )}
    </Flex>
  )
}
