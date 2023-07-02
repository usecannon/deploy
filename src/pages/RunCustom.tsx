import 'react-diff-view/style/index.css'

import _ from 'lodash'
import { AddIcon, ChevronDownIcon, MinusIcon } from '@chakra-ui/icons'
import {
  Address,
  Hex,
  TransactionRequestBase,
  encodeAbiParameters,
  encodePacked,
  getFunctionSelector,
  isAddress,
  zeroAddress,
} from 'viem'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Container,
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
import NoncePicker from '../components/NoncePicker'

export function RunCustom() {
  const currentSafe = useStore((s) => s.currentSafe)
  const navigate = useNavigate()

  const [target, setTarget] = useState('')
  const [queuedTxns, setQueuedTxns] = useState<
    Omit<TransactionRequestBase, 'from'>[]
  >([null])

  const [pickedNonce, setPickedNonce] = useState<number | null>(null)

  console.log('qd txns', queuedTxns)

  const cannonInfo = useCannonPackageContracts(target)

  const multisendTxn =
    queuedTxns.indexOf(null) === -1
      ? makeMultisend(
          [
            {
              to: zeroAddress,
              data: encodeAbiParameters(
                [{ type: 'string[]' }],
                [['invoke', cannonInfo.pkgUrl || '']]
              ),
            } as Partial<TransactionRequestBase>,
          ].concat(queuedTxns)
        )
      : { value: 0n }

  const stagedTxn = usePrepareSendTransaction({
    account: currentSafe.address,
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
          _nonce: pickedNonce
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
    <Container maxW="100%" w="container.sm" pb="12">
      <FormControl mb="8">
        <FormLabel>Cannon Package or Contract Address</FormLabel>
        <Input
          type="text"
          onChange={(event) => setTarget(event.target.value)}
        />
        <FormHelperText>
          A package must have deployment data for the same network as your
          connected wallet.
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
        <FormControl mb="8">
          <FormLabel>Transactions</FormLabel>
          {queuedTxns.map((txn, i) => (
            <DisplayedTransaction
              editable
              contracts={cannonInfo.contracts}
              onTxn={(txn) => updateQueuedTxn(i, txn)}
            />
          ))}
          <HStack my="3">
            <Button
              size="xs"
              leftIcon={<AddIcon />}
              onClick={() => setQueuedTxns(_.clone(queuedTxns.concat([{}])))}
            >
              Add Transaction
            </Button>
            {queuedTxns.length > 1 && (
              <Button
                size="xs"
                leftIcon={<MinusIcon />}
                onClick={() =>
                  setQueuedTxns(
                    _.clone(queuedTxns.slice(0, queuedTxns.length - 1))
                  )
                }
              >
                Remove Transaction
              </Button>
            )}
          </HStack>
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

      {(cannonInfo.contracts || isAddress(target)) && (
        <Box mb="6">
          <NoncePicker safe={currentSafe} onPickedNonce={setPickedNonce} />
          <HStack gap="6">
            <Button
              size="lg"
              w="100%"
              isDisabled={!stagedTxn.data || !stager.canSign}
              onClick={() => stager.sign()}
            >
              Queue &amp; Sign
            </Button>
            <Button
              size="lg"
              w="100%"
              isDisabled={!stagedTxn.data || !stager.canExecute}
              onClick={() => execTxn.write()}
            >
              Execute
            </Button>
          </HStack>
          {stagedTxn.isError && (
            <Alert status="error" mt="6">
              <AlertIcon />
              Transaction Error: {stagedTxn.error.message}
            </Alert>
          )}
        </Box>
      )}
    </Container>
  )
}
