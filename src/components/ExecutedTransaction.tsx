import { Box, Flex, HStack, Heading, Text } from '@chakra-ui/react'
import { SafeMultisigTransactionWithTransfersResponse } from '@safe-global/api-kit'

import { SafeDefinition } from '../store'

interface Params {
  safe: SafeDefinition
  tx: SafeMultisigTransactionWithTransfersResponse
}

export function ExecutedTransaction({ safe, tx }: Params) {
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
          <Heading size="sm">Transaction #{tx.nonce}</Heading>
        </HStack>
        <Text fontSize="xs" opacity="0.66">
          Safe: {safe.address} (Chain ID: {safe.chainId})
        </Text>
        <Text fontSize="xs" opacity="0.66" noOfLines={1}>
          Hash: {tx.transactionHash}
        </Text>
      </Box>
    </Flex>
  )
}
