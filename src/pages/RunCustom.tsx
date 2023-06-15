import 'react-diff-view/style/index.css'

import _ from 'lodash';

import { getFunctionSelector, isAddress } from 'viem';
import { formatAbiItem } from 'viem/dist/cjs/utils/abi/formatAbiItem'

import {
  Box,
  Button,
  Container,
  EditableInput,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Heading,
  Text,
  Input,
} from '@chakra-ui/react'
import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import { useContractWrite, usePrepareSendTransaction, useSendTransaction } from 'wagmi'

import { Transaction } from '../components/Transaction'
import { useTxnStager } from '../hooks/backend'
import { useStore } from '../store'
import { EditableAutocompleteInput } from '../components/EditableAutocompleteInput';
import { useCannonPackageContracts } from '../hooks/cannon';

export function RunCustom() {
  const [target, setTarget] = useState('')
  const [txnData, setTxnData] = useState('')
  const [execContract, setExecContract] = useState('')
  const [execFunc, setExecFunc] = useState('')
  const [value, setValue] = useState(ethers.BigNumber.from(0))
  const [queuedTxns, setQueuedTxns] = useState([]);

  const safeAddress = useStore((s) => s ? s.safeAddress.split(':')[1] : s) as `0x${string}`

  let toAddress: string | null = null
  if (isAddress(target)) {
    toAddress = target

  }
  const cannonInfo = useCannonPackageContracts(target);

  console.log(cannonInfo);

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

  function extractFunctionNames(contractAbi: any[]) {

    return contractAbi
      .filter(a => a.type === 'function' && a.stateMutability !== 'view')
      .map(a => {
        return { label: formatAbiItem(a), secondary: getFunctionSelector(a) }
      })
  }

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

      {cannonInfo.registryQuery.isSuccess && !cannonInfo.contracts && <Text>Cannon package detected. Loading from IPFS (this may take some time)...</Text>}

      {cannonInfo.contracts && <FormControl mb="4">
        <HStack textStyle='monospace'>
          <FormLabel>Contract</FormLabel>
          <EditableAutocompleteInput placeholder='Contract' items={Object.entries(cannonInfo.contracts).map(([k,v]) => ({ label: k, secondary: v.address }))} onChange={(item) => setExecContract(item)} />
          <Text>.</Text>
          <EditableAutocompleteInput placeholder='func' items={execContract ? extractFunctionNames(cannonInfo.contracts[execContract].abi) : []} onChange={(item) => setExecFunc(item)} />
        </HStack>
        <FormHelperText>
          Enter the contract or package for which this transaction should be
          executed. This can either be a Cannon package (in which case, you will
          be prompted to select method, args, etc.), or an address (in which
          case, you will supply with custom data/ABI).
        </FormHelperText>
      </FormControl>}

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

      {queuedTxns.length > 0 && <Box mb="6">
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
