import {
  Box,
  Button,
  Flex,
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
import { SafeMultisigTransactionListResponse } from '@safe-global/api-kit'

import { TransactionDisplay } from '../components/TransactionDisplay'
import { getSafeChain } from '../hooks/safe'

interface Params {
  safeAddress: string
  tx: SafeMultisigTransactionListResponse['results'][0]
  modalDisplay?: boolean
  isExecutable?: boolean
}

export function Transaction({
  safeAddress,
  tx,
  modalDisplay = false,
  isExecutable = false,
}: Params) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const chain = getSafeChain(safeAddress)

  console.log({ chain })

  return (
    <Flex
      my="3"
      p="3"
      border="1px solid"
      borderColor="gray.500"
      borderRadius="md"
      alignItems="center"
    >
      <Box>
        <Text>{chain.name}</Text>
        <Heading size="md">Transaction #{tx.nonce}</Heading>
      </Box>
      {modalDisplay ? (
        <>
          <Button onClick={onOpen} ml="auto">
            Review & {isExecutable ? 'Execute' : 'Queue'}
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
        <Button ml="auto">
          Review & {isExecutable ? 'Execute' : 'Queue'}
          {/* Should link to pages/Transaction at /txn/chainId/txId */}
        </Button>
      )}
    </Flex>
  )
}
