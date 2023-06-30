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
import { Link } from 'react-router-dom'

import { SafeTransaction } from '../types'
import { TransactionDisplay } from '../components/TransactionDisplay'

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
      borderColor="gray.600"
      borderRadius="md"
      alignItems="center"
    >
      <Box alignContent={'center'}>
        <Heading size="sm" mb="1">
          Transaction #{tx._nonce}
        </Heading>
        <Text fontSize="xs" opacity="0.66">
          Safe: {safeAddress} (Chain ID: {chainId})
        </Text>
      </Box>
      {modalDisplay ? (
        <>
          <Button size="sm" onClick={onOpen} ml="auto">
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
            <Button size="sm">Review & Sign</Button>
          </Link>
        </Box>
      )}
    </Flex>
  )
}
