import { ChevronRightIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  Heading,
  IconButton,
  Link as ChakraLink,
  LinkBox,
  LinkOverlay,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getSafeUrl } from '../hooks/safe'
import { SafeDefinition } from '../store'
import { SafeTransaction } from '../types'
import { parseHintedMulticall } from '../utils/cannon'
import { getSafeTransactionHash } from '../utils/safe'

interface Params {
  safe: SafeDefinition
  tx: SafeTransaction
  hideExternal: boolean
}

export function Transaction({ safe, tx, hideExternal }: Params) {
  const hintData = parseHintedMulticall(tx.data)

  console.log(tx._nonce, hintData)

  const sigHash = useMemo(
    () => hintData && getSafeTransactionHash(safe, tx),
    [safe, tx]
  )

  const isLink = sigHash != null

  return (
    <LinkBox
      as={Flex}
      display={hideExternal && !isLink ? 'none' : 'flex'}
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
        {isLink ? (
          <LinkOverlay
            as={Link}
            to={`/txn/${safe.chainId}/${safe.address}/${tx._nonce}/${sigHash}`}
          >
            <ChevronRightIcon boxSize={6} />
          </LinkOverlay>
        ) : (
          <ChakraLink
            href={`${getSafeUrl(safe, '/transactions/tx')}&id=${tx.safeTxHash}`}
            isExternal
          >
            <IconButton
              variant="link"
              opacity={0.4}
              transform="translateY(1px)"
              _hover={{ opacity: 1 }}
              aria-label={`View Transaction #${tx._nonce}`}
              icon={<ExternalLinkIcon />}
            />
          </ChakraLink>
        )}
      </Box>
    </LinkBox>
  )
}
