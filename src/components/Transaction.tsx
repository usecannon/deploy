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
  Tag,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { useMemo } from 'react'

import { SafeDefinition } from '../store'
import { SafeTransaction } from '../types'
import { TransactionDisplay } from '../components/TransactionDisplay'
import { getSafeTransactionHash } from '../utils/safe'
import { parseHintedMulticall } from '../utils/cannon'

interface Params {
  safe: SafeDefinition
  tx: SafeTransaction
  modalDisplay?: boolean
  canSign?: boolean
  canExecute?: boolean
}

export function Transaction({
  safe,
  tx,
  modalDisplay = false,
  canSign = false,
  canExecute = false,
}: Params) {
  const { isOpen, onOpen, onClose } = useDisclosure()

  const hintData = parseHintedMulticall(tx.data)

  const sigHash = useMemo(
    () => hintData?.type && getSafeTransactionHash(safe, tx),
    [safe, tx]
  )

  return (
    <Flex
      my="3"
      p="3"
      border="1px solid"
      borderColor="gray.600"
      borderRadius="md"
      alignItems="center"
    >
      <Box alignContent={'center'} minWidth={0}>
        <HStack mb={1}>
          {hintData?.type && (
            <Tag textTransform="uppercase" size="md">
              <Text as="b">{hintData.type}</Text>
            </Tag>
          )}
          <Heading size="sm">Transaction #{tx._nonce}</Heading>
        </HStack>
        <Text fontSize="xs" opacity="0.66" noOfLines={1}>
          {sigHash || tx.transactionHash}
        </Text>
      </Box>
      {modalDisplay ? (
        <>
          <Button size="sm" onClick={onOpen} ml="auto">
            {canSign
              ? `Review & ${canExecute ? 'Execute' : 'Queue'}`
              : 'View Details'}
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
          <Link
            to={`/txn/${safe.chainId}/${safe.address}/${tx._nonce}/${sigHash}`}
          >
            {hintData && (
              <Button size="sm">
                {canSign
                  ? `Review & ${canExecute ? 'Execute' : 'Queue'}`
                  : 'View Details'}
              </Button>
            )}
          </Link>
        </Box>
      )}
    </Flex>
  )
}
