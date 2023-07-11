import _ from 'lodash'
import { Address, isAddress, zeroAddress } from 'viem'
import {
  Box,
  Button,
  Container,
  HStack,
  Text,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Tooltip,
  Tag,
  Flex,
} from '@chakra-ui/react'
import { useContractWrite, useChainId, useAccount } from 'wagmi'
import { useNavigate, useParams } from 'react-router-dom'

import { SafeTransaction } from '../types'
import { TransactionDisplay } from '../components/TransactionDisplay'
import { useSafeTransactions, useTxnStager } from '../hooks/backend'
import { getSafeTransactionHash } from '../utils/safe'
import { useExecutedTransactions } from '../hooks/safe'
import { SafeDefinition } from '../store'
import { parseHintedMulticall } from '../utils/cannon'

export function TransactionDetail() {
  let { safeAddress } = useParams()
  const { chainId, nonce, sigHash } = useParams()

  let parsedChainId = 0
  let parsedNonce = 0

  try {
    parsedChainId = parseInt(chainId)
    parsedNonce = parseInt(nonce)
  } catch (e) {}

  const walletChainId = useChainId()
  const account = useAccount()

  const navigate = useNavigate()

  if (!isAddress(safeAddress)) {
    safeAddress = zeroAddress
  }

  const safe: SafeDefinition = {
    chainId: parsedChainId,
    address: safeAddress as Address,
  }

  const { nonce: safeNonce, staged, stagedQuery } = useSafeTransactions(safe)

  const history = useExecutedTransactions(safe)

  // get the txn we want, we can just pluck it out of staged transactions if its there
  let safeTxn: SafeTransaction | null = null

  if (parsedNonce < safeNonce) {
    // TODO: the gnosis safe transaction history is quite long, but if its not on the first page, we have to call "next" to get more txns until
    // we find the nonce we want. no way to just get the txn we want unfortunately
    // also todo: code dup
    safeTxn =
      history.results.find(
        (txn) =>
          txn._nonce.toString() === nonce &&
          (!sigHash || sigHash === getSafeTransactionHash(safe, txn))
      ) || null
  } else if (staged) {
    safeTxn =
      staged.find(
        (s) =>
          s.txn._nonce.toString() === nonce &&
          (!sigHash || sigHash === getSafeTransactionHash(safe, s.txn))
      )?.txn || null
  }

  const stager = useTxnStager(safeTxn || {}, {
    safe: {
      chainId: parseInt(chainId) as any,
      address: safeAddress as Address,
    },
    onSignComplete: () => {
      navigate('/')
    },
  })
  const execTxn = useContractWrite(stager.executeTxnConfig)

  const hintData = parseHintedMulticall(safeTxn?.data)

  if (!safeTxn && stagedQuery.isFetched) {
    return (
      <Container>
        <Text>
          Transaction not found! Current safe nonce:{' '}
          {safeNonce ? safeNonce.toString() : 'none'}, Highest Staged Nonce:{' '}
          {_.last(staged)?.txn._nonce || safeNonce}
        </Text>
      </Container>
    )
  }

  return (
    <Box p="12" pt="2" maxWidth="100%">
      <Flex
        direction="row"
        alignItems="center"
        borderBottom="1px solid"
        borderColor="whiteAlpha.300"
        pb="6"
        mb="8"
      >
        <Box>
          <Text mb="1.5" opacity={0.9}>
            <strong>Safe:</strong> {safeAddress} (Chain ID: {chainId})
          </Text>
          <Heading size="lg">Transaction #{nonce}</Heading>
        </Box>
        <Flex ml="auto">
          <Box borderRadius="lg" bg="blackAlpha.300" ml="6" py="4" px="6">
            <FormControl>
              <FormLabel mb="1.5">Transaction Source</FormLabel>

              {hintData.type === 'deploy' && (
                <Tag textTransform="uppercase" size="md">
                  <Text as="b">GitOps</Text>
                </Tag>
              )}

              {hintData.type === 'invoke' && (
                <Tag textTransform="uppercase" size="md">
                  <Text as="b">Deployer</Text>
                </Tag>
              )}

              {hintData.type !== 'deploy' && hintData.type !== 'invoke' && (
                <Tag textTransform="uppercase" size="md">
                  <Text as="b">External</Text>
                </Tag>
              )}
            </FormControl>
          </Box>
          <Box borderRadius="lg" bg="blackAlpha.300" ml="6" py="4" px="6">
            <FormControl>
              <FormLabel mb="1">Cannon&nbsp;Package</FormLabel>
              {hintData.cannonPackage}
            </FormControl>
          </Box>
        </Flex>
      </Flex>
      <TransactionDisplay
        safe={safe}
        safeTxn={safeTxn}
        verify={parsedNonce >= safeNonce}
        allowPublishing
      />
      {parsedNonce >= safeNonce && (
        <Box>
          {account.isConnected && walletChainId === parsedChainId ? (
            <HStack
              gap="6"
              marginTop="20px"
              marginLeft={'auto'}
              marginRight={'auto'}
            >
              <Tooltip label={stager.signConditionFailed}>
                <Button
                  size="lg"
                  w="100%"
                  isDisabled={safeTxn && !!stager.signConditionFailed}
                  onClick={() => stager.sign()}
                >
                  Sign
                </Button>
              </Tooltip>
              <Tooltip label={stager.execConditionFailed}>
                <Button
                  size="lg"
                  w="100%"
                  isDisabled={safeTxn && !!stager.execConditionFailed}
                  onClick={() => execTxn.write()}
                >
                  Execute
                </Button>
              </Tooltip>
            </HStack>
          ) : (
            <Text align={'center'}>
              Please connect a wallet and ensure its connected to the correct
              network to sign!
            </Text>
          )}
        </Box>
      )}
    </Box>
  )
}
