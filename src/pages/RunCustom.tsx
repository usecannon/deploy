import {
  Container,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Box,
  Heading,
  Button,
} from '@chakra-ui/react'
import { Transaction } from '../components/Transaction'
import 'react-diff-view/style/index.css'
import { useEffect, useState } from 'react'

import { ethers } from 'ethers';

import { usePrepareSendTransaction, useSendTransaction } from 'wagmi'
import { useTxnStager } from '../hooks/backend';
  
  export function Deploy() {
    const [target, setTarget] = useState('');
    const [txnData, setTxnData] = useState('');
    const [value, setValue] = useState(0n);

    const safeAddress = '0x';


    let toAddress: string|null = null;
    if (ethers.utils.isAddress(target)) {
      toAddress = target;
    }
    // TODO: populate to address if target is a cannon package...

    const stagedTxn = usePrepareSendTransaction({
      account: safeAddress,
      to: toAddress,
      data: '0x' + (txnData.startsWith('0x') ? txnData.slice(2) : txnData) as `0x${string}`,
      value: value
    })

    // TODO: check types
    const stager = useTxnStager(stagedTxn.data as any);

    return (
      <Container maxW="100%" w="container.sm">
        <FormControl mb="4">
          <FormLabel>Target</FormLabel>
          <Input type="text" />
          <FormHelperText>
            Enter the contract or package for which this transaction should be executed. This can either
            be a Cannon package (in which case, you will be prompted to select method, args, etc.), or an
            address (in which case, you will supply with custom data/ABI).
          </FormHelperText>
        </FormControl>

        <FormControl mb="4">
          <FormLabel>Value</FormLabel>
          <Input type="text" />
          <FormHelperText>
            Amount of ETH to send as part of transaction
          </FormHelperText>
        </FormControl>

        <FormControl mb="4">
          <FormLabel>Transaction Data</FormLabel>
          <Input type="text" />
          <FormHelperText>
            0x prefixed hex code data to send with transaction
          </FormHelperText>
        </FormControl>

        {/* todo: nonce override */}

        <Box mb="6">
          <Heading size="sm">Transactions to Queue</Heading>
          <Transaction modalDisplay />
          <Button w="100%" disabled={!stager.canSign} onClick={() => stager.sign()}>Add to Queue</Button>
        </Box>
      </Container>
    )
  }
  