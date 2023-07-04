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
  Tag,
  useDisclosure,
  HStack,
} from '@chakra-ui/react'
import { Link } from 'react-router-dom'

import { SafeTransaction } from '../types'
import { TransactionDisplay } from '../components/TransactionDisplay'
import { parseHintedMulticall } from '../utils/cannon'
import { useMemo } from 'react'
import { getSafeTransactionHash } from '../utils/safe'
import { SafeDefinition } from '../store'

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

  let hintData: ReturnType<typeof parseHintedMulticall> | null = null
  try {
    hintData = parseHintedMulticall(tx.data)
  } catch (err) {
    console.log('hint data not parsable', err)
  }

  const sigHash = useMemo(() => getSafeTransactionHash(safe, tx), [safe, tx])

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
          <Tag textTransform="uppercase" size="md">
            <Text as="b">{hintData.type}</Text>
          </Tag>
          <Heading size="sm">Transaction #{tx._nonce}</Heading>
        </HStack>
        <Text fontSize="xs" opacity="0.66">
          Safe: {safe.address} (Chain ID: {safe.chainId})
        </Text>
        <Text fontSize="xs" opacity="0.66" noOfLines={1}>
          {sigHash}
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
            <Button size="sm">Review & Sign</Button>
          </Link>
        </Box>
      )}
    </Flex>
  )
}
