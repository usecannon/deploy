import 'react-diff-view/style/index.css'

import _ from 'lodash'
import { AddIcon, ChevronDownIcon, MinusIcon } from '@chakra-ui/icons'
import {
  Address,
  Hex,
  TransactionRequestBase,
  encodePacked,
  getFunctionSelector,
  isAddress,
  zeroAddress,
} from 'viem'
import {
  Container,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Button,
  EditableInput,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Heading,
  Input,
  Text,
} from '@chakra-ui/react'
import { ethers } from 'ethers'
import { formatAbiItem } from 'viem/dist/cjs/utils/abi/formatAbiItem'
import { redirect, useNavigate } from 'react-router-dom'
import {
  useContractWrite,
  usePrepareSendTransaction,
  useSendTransaction,
} from 'wagmi'
import { useEffect, useState } from 'react'

import * as query from '../utils/query'
import { DisplayedTransaction } from '../components/DisplayedTransaction'
import { EditableAutocompleteInput } from '../components/EditableAutocompleteInput'
import { Transaction } from '../components/Transaction'
import { makeMultisend } from '../utils/multisend'
import { useCannonPackageContracts } from '../hooks/cannon'
import { useStore } from '../store'
import { useTxnStager } from '../hooks/backend'

export function RunCustom() {
  const [target, setTarget] = useState('')
  const [queuedTxns, setQueuedTxns] = useState<
    Omit<TransactionRequestBase, 'from'>[]
  >([null])

  const navigate = useNavigate()

  console.log('qd txns', queuedTxns)

  const safeAddress = useStore((s) => s.safeAddresses[s.safeIndex]?.address)

  let toAddress: string | null = null
  if (isAddress(target)) {
    toAddress = target
  }
  const cannonInfo = useCannonPackageContracts(target)

  const multisendTxn =
    queuedTxns.indexOf(null) === -1
      ? makeMultisend(
          [
            {
              to: zeroAddress,
              data: encodePacked(['string'], [cannonInfo.pkgUrl || '']),
            } as Partial<TransactionRequestBase>,
          ].concat(queuedTxns)
        )
      : { value: 0n }

  const stagedTxn = usePrepareSendTransaction({
    account: safeAddress,
    ...multisendTxn,
    value: BigInt(multisendTxn.value),
  })

  // TODO: check types
  const stager = useTxnStager(
    stagedTxn.data
      ? {
          to: stagedTxn.data.to,
          value: stagedTxn.data.value.toString(),
          data: stagedTxn.data.data,
          gasPrice: stagedTxn.data?.gasPrice?.toString(),
          safeTxGas: stagedTxn.data?.gas?.toString(),
        }
      : {},
    {
      onSignComplete() {
        console.log('signing is complete, redirect')
        navigate('/')
      },
    }
  )

  const execTxn = useContractWrite(stager.executeTxnConfig)

  const funcIsPayable = false

  function updateQueuedTxn(
    i: number,
    txn: Omit<TransactionRequestBase, 'from'>
  ) {
    queuedTxns[i] = txn
    setQueuedTxns(_.clone(queuedTxns))
  }

  return (
    <Container maxW="100%" w="container.sm">
      <Text mb="8">
        Use this tool to specify transactions to queue, either for a Cannon
        package or any contract address.
      </Text>

      <FormControl mb="6">
        <FormLabel>Cannon Package or Contract Address</FormLabel>
        <Input
          type="text"
          onChange={(event) => setTarget(event.target.value)}
        />
        <FormHelperText>
          The Cannon package must have deployment data for the network your
          wallet is connected to.
        </FormHelperText>
      </FormControl>

      {cannonInfo.pkgUrl && !cannonInfo.contracts && (
        <Alert status="info">
          <AlertIcon />
          <Box>
            <AlertTitle lineHeight="1.2">Cannon Package Detected</AlertTitle>
            <AlertDescription fontSize="sm">
              Downloading {cannonInfo.pkgUrl}
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {cannonInfo.contracts && (
        <FormControl mb="4">
          <Heading size="sm">Transactions to Queue</Heading>
          {queuedTxns.map((txn, i) => (
            <DisplayedTransaction
              editable
              contracts={cannonInfo.contracts}
              onTxn={(txn) => updateQueuedTxn(i, txn)}
            />
          ))}
          <HStack>
            <Button
              onClick={() => setQueuedTxns(_.clone(queuedTxns.concat([{}])))}
            >
              <AddIcon />
            </Button>
            {queuedTxns.length > 1 && (
              <Button
                onClick={() =>
                  setQueuedTxns(
                    _.clone(queuedTxns.slice(0, queuedTxns.length - 1))
                  )
                }
              >
                <MinusIcon />
              </Button>
            )}
          </HStack>
          <FormHelperText>
            Type a contract name from the cannon package, followed by a function
            with args to execute. To execute more than one function, click the
            plus button.
          </FormHelperText>
        </FormControl>
      )}

      {(isAddress(target) || funcIsPayable) && (
        <FormControl mb="4">
          <FormLabel>Value</FormLabel>
          <Input
            type="text"
            onChange={(event) =>
              updateQueuedTxn(0, {
                ...queuedTxns[0],
                value: BigInt(event.target.value),
              })
            }
          />
          <FormHelperText>
            Amount of ETH to send as part of transaction
          </FormHelperText>
        </FormControl>
      )}

      {isAddress(target) && (
        <FormControl mb="4">
          <FormLabel>Transaction Data</FormLabel>
          <Input
            type="text"
            placeholder="0x"
            onChange={(event) =>
              updateQueuedTxn(0, {
                ...queuedTxns[0],
                data: (event.target.value as Hex) || '0x',
              })
            }
          />
          <FormHelperText>
            0x prefixed hex code data to send with transaction
          </FormHelperText>
        </FormControl>
      )}

      {/* todo: nonce override */}

      {(cannonInfo.contracts || isAddress(target)) && (
        <Box mb="6">
          <HStack>
            <Button
              w="100%"
              isDisabled={!stagedTxn.data || !stager.canSign}
              onClick={() => stager.sign()}
            >
              Sign
            </Button>
            <Button
              w="100%"
              isDisabled={!stagedTxn.data || !stager.canExecute}
              onClick={() => execTxn.write()}
            >
              Execute
            </Button>
          </HStack>
          {stagedTxn.isError && (
            <Text>Transaction Error: {stagedTxn.error.message}</Text>
          )}
        </Box>
      )}
    </Container>
  )
}
