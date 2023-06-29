import { Box, Button, Container, Flex, Heading, Text } from '@chakra-ui/react'
import {
  Hex,
  decodeAbiParameters,
  decodeFunctionData,
  hexToString,
  zeroAddress,
} from 'viem'

import MulticallABI from '../../backend/src/abi/Multicall.json'
import { DisplayedTransaction } from './DisplayedTransaction'
import { SafeTransaction } from '../types'
import { useCannonPackageContracts } from '../hooks/cannon'

export function TransactionDisplay(props: { safeTxn: SafeTransaction }) {
  // see waht we can parse out of the data
  let decoded: { args: readonly unknown[]; functionName: string } = {
    args: [],
    functionName: '',
  }
  try {
    decoded = decodeFunctionData({
      abi: MulticallABI,
      data: props.safeTxn.data as Hex,
    })
  } catch (err) {
    console.log('didnt parse', err)
  }

  let hintType = ''
  let hintCannonPackage = ''
  let hintGitRepoHash = ''
  if (
    (decoded.functionName === 'aggregate3' ||
      decoded.functionName === 'aggregate3Value') &&
    decoded.args[0][0].target === zeroAddress
  ) {
    [hintType, hintCannonPackage, hintGitRepoHash] = decodeAbiParameters([{ type: 'string[]'}], decoded.args[0][0].callData)[0]
  }

  console.log('got hint data', hintCannonPackage, decoded)

  const cannonInfo = useCannonPackageContracts(
    hintCannonPackage ? '@' + hintCannonPackage.replace('://', ':') : ''
  )

  console.log('cannon info', cannonInfo)

  if (cannonInfo.contracts && decoded.args.length) {
    const txns = (decoded.args[0] as any[])
      .slice(1)
      .map((txn) => ({ to: txn.target, data: txn.callData, value: txn.value }))

    return (
      <Box maxW="100%">
        <Heading size="sm">Transactions</Heading>
        {txns.map((txn, i) => (
          <DisplayedTransaction contracts={cannonInfo.contracts} txn={txn} />
        ))}
      </Box>
    )
  } else {
    return (
      <Container>
        <Text>Parsing Transaction Data...</Text>
      </Container>
    )
  }

  // TODO: print raw
  return (
    <Container>
      <Text>Unable to parse data!</Text>
    </Container>
  )
}
