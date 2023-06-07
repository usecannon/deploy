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
import { TransactionDisplay } from '../components/TransactionDisplay'

export function Transaction({ modalDisplay = false, isExecutable = false }) {
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
      <Box>
        <Text>Network Name</Text>
        <Heading size="md">Transaction #XXX</Heading>
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
