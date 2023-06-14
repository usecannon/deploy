import 'react-diff-view/style/index.css'

import _ from 'lodash';

import { isAddress } from 'viem';

import {
  Box,
  Button,
  Container,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Heading,
  Input,
} from '@chakra-ui/react'
import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import { useContractWrite, usePrepareSendTransaction, useSendTransaction } from 'wagmi'

import { Transaction } from '../components/Transaction'
import { useTxnStager } from '../hooks/backend'
import { useStore } from '../store'

export function RunCustom() {
  const [target, setTarget] = useState('')
  const [txnData, setTxnData] = useState('')
  const [value, setValue] = useState(ethers.BigNumber.from(0))
  const [queuedTxns, setQueuedTxns] = useState([]);

  const safeAddress = useStore((s) => s ? s.safeAddress.split(':')[1] : s) as `0x${string}`

  let toAddress: string | null = null
  if (isAddress(target)) {
    toAddress = target

  }
  // TODO: populate to address if target is a cannon package...

  const stagedTxn = usePrepareSendTransaction({
    account: safeAddress,
    to: toAddress,
    data: ('0x' +
      (txnData.startsWith('0x') ? txnData.slice(2) : txnData)) as `0x${string}`,
    value: BigInt(value.toString()),
  })

  // TODO: check types
  const stager = useTxnStager({
    to: toAddress,
    value: value.toString(),
    gasPrice: stagedTxn.data?.gasPrice?.toString(),
    safeTxGas: stagedTxn.data?.gas?.toString()
  })

  const execTxn = useContractWrite(stager.executeTxnConfig);

  console.log('tx stager', stager);

  const funcIsPayable = false;

  return (
    <Container maxW="100%" w="container.sm">
      <FormControl mb="4">
        <FormLabel>Target</FormLabel>
        <Input type="text" onChange={(event) => setTarget(event.target.value)} />
        <FormHelperText>
          Enter the contract or package for which this transaction should be
          executed. This can either be a Cannon package (in which case, you will
          be prompted to select method, args, etc.), or an address (in which
          case, you will supply with custom data/ABI).
        </FormHelperText>
      </FormControl>

      {(isAddress(target) || funcIsPayable) && <FormControl mb="4">
        <FormLabel>Value</FormLabel>
        <Input type="text" onChange={(event) => setValue(ethers.utils.parseEther(event.target.value))} />
        <FormHelperText>
          Amount of ETH to send as part of transaction
        </FormHelperText>
      </FormControl>}
      

      {isAddress(target) && <FormControl mb="4">
        <FormLabel>Transaction Data</FormLabel>
        <Input type="text" placeholder='0x' onChange={(event) => setTxnData(event.target.value || '0x')} />
        <FormHelperText>
          0x prefixed hex code data to send with transaction
        </FormHelperText>
      </FormControl>}

      {/* todo: nonce override */}

      {queuedTxns.length && <Box mb="6">
        <Heading size="sm">Transactions to Queue</Heading>
        {/* <Transaction modalDisplay /> */}
        <HStack>
          <Button
            w="100%"
            isDisabled={!stager.canSign}
            onClick={() => stager.sign()}
          >
            Sign
          </Button>
          <Button
            w="100%"
            isDisabled={!stager.canExecute}
            onClick={() => execTxn.write()}
          >
            Execute
          </Button>
        </HStack>
      </Box>}
    </Container>
  )
}
