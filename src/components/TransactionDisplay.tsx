import { Box, Button, Container, Flex, Heading, Text } from '@chakra-ui/react'
import { SafeTransaction } from '../types'
import { DisplayedTransaction } from './DisplayedTransaction'
import { Hex, decodeAbiParameters, decodeFunctionData, zeroAddress } from 'viem'

import MulticallABI from '../../backend/src/abi/Multicall.json'
import { useCannonPackageContracts } from '../hooks/cannon'

export function TransactionDisplay(props: { safeTxn: SafeTransaction }) {

  // see waht we can parse out of the data
  try {
    const decoded = decodeFunctionData({
      abi: MulticallABI,
      data: props.safeTxn.data as Hex
    });

    if (decoded.functionName !== 'aggregate3' || decoded.functionName != 'aggregate3Value') {
      throw new Error(`unexpected function name: ${decoded.functionName}`)
    }

    if (decoded.args[0][0].target !== zeroAddress) {
      throw new Error(`no hint data (unexpected address): ${decoded.args[0][0].target}`);
    }

    const [hintCannonPackage] = decodeAbiParameters(['string'], decoded.args[0][0].callData)

    const cannonInfo = useCannonPackageContracts(`@ipfs:${hintCannonPackage}`)

    const txns = (decoded.args[0] as any[]).slice(1).map(txn => ({ to: txn.target, data: txn.callData, value: txn.value }));

    return <Container>
        <Heading size="sm">Transactions</Heading>
        {txns.map((txn, i) => <DisplayedTransaction contracts={cannonInfo.contracts} txn= />)}
        
      </Container>
  } catch(err) {
    console.log('didnt parse', err);
  }

  // TODO: print raw
  return <Container>
        <Text>Unable to parse data!</Text>
  </Container>
}
