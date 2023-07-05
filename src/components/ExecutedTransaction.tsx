import { Box, Flex, HStack, Heading, Text } from '@chakra-ui/react'
import { SafeMultisigTransactionListResponse } from '@safe-global/api-kit'

import { SafeDefinition } from '../store'
import { parseHintedMulticall } from '../utils/cannon'

interface Params {
  safe: SafeDefinition
  tx: SafeMultisigTransactionListResponse['results'][0]
}

export function ExecutedTransaction({ safe, tx }: Params) {
  const data = parseHintedMulticall(tx.data as `0x${string}`)

  if (data) console.log('data', data)

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
        <Text fontSize="xs" opacity="0.66" noOfLines={1}>
          Hash: {tx.transactionHash}
        </Text>
      </Box>
    </Flex>
  )
}
