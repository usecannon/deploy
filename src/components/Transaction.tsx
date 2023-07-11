import {
  Box,
  Flex,
  Heading,
  useDisclosure,
  LinkBox,
  LinkOverlay,
} from '@chakra-ui/react'
import { ChevronRightIcon } from '@chakra-ui/icons'

import { Link } from 'react-router-dom'
import { useMemo } from 'react'

import { SafeDefinition } from '../store'
import { SafeTransaction } from '../types'
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
    () => hintData && getSafeTransactionHash(safe, tx),
    [safe, tx]
  )

  const isLink = sigHash != null

  return (
    <LinkBox
      as={Flex}
      mb="4"
      p="5"
      border="1px solid"
      bg="blackAlpha.300"
      borderColor={isLink ? 'gray.600' : 'gray.700'}
      borderRadius="md"
      alignItems="center"
      shadow={isLink ? 'lg' : ''}
      transition="all 0.2s"
      _hover={isLink ? { shadow: 'xl', bg: 'blackAlpha.400' } : {}}
    >
      <Box alignContent={'center'} minWidth={0}>
        <Heading size="md">Transaction #{tx._nonce}</Heading>
      </Box>
      <Box ml="auto" pl="2">
        {isLink && (
          <LinkOverlay
            as={Link}
            to={`/txn/${safe.chainId}/${safe.address}/${tx._nonce}/${sigHash}`}
          >
            <ChevronRightIcon boxSize={6} />
          </LinkOverlay>
        )}
      </Box>
    </LinkBox>
  )
}
