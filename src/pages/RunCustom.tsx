import 'react-diff-view/style/index.css'

import _ from 'lodash'
import { AddIcon, ChevronDownIcon, MinusIcon } from '@chakra-ui/icons'
import {
  Abi,
  Address,
  Hex,
  TransactionRequestBase,
  decodeErrorResult,
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
  Tooltip,
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
import { useSimulatedTxns } from '../hooks/fork'

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
      : null

  const txnInfo = useSimulatedTxns(currentSafe, queuedTxns)

  console.log('txnresults', txnInfo.txnResults)

  // TODO: check types
  const stager = useTxnStager(
    multisendTxn
      ? {
          to: multisendTxn.to,
          value: multisendTxn.value.toString(),
          data: multisendTxn.data,
          safeTxGas: txnInfo.txnResults.length
            ? txnInfo.txnResults
                .reduce((prev, cur) => ({
                  gasUsed: (prev?.gasUsed || 0n) + (cur?.gasUsed || 0n),
                  callResult: '0x',
                }))
                .gasUsed.toString()
            : undefined,
          operation: '1',
          _nonce: pickedNonce,
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

  const txnHasError = !!txnInfo.txnResults.filter((r) => r?.error).length

  console.log('TXN HAS ERROR', txnHasError)
  console.log('sign status', stager)

  function decodeError(err: Hex) {
    for (const contract in cannonInfo.contracts) {
      try {
        const parsedError = decodeErrorResult({
          abi: cannonInfo.contracts[contract].abi as Abi,
          data: err,
        })

        return `failure in contract ${contract}: ${
          parsedError.errorName
        }(${parsedError.args.join(', ')})`
      } catch (err) {}
    }

    return 'unknown error'
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
            <Box>
              <DisplayedTransaction
                editable
                contracts={cannonInfo.contracts}
                onTxn={(txn) => updateQueuedTxn(i, txn)}
              />
              {txnInfo.txnResults &&
                txnInfo.txnResults.length === queuedTxns.length &&
                txnInfo.txnResults[i].error && (
                  <Alert status="error" mt="6">
                    <AlertIcon />
                    Transaction Error:{' '}
                    {txnInfo.txnResults[i].callResult
                      ? decodeError(txnInfo.txnResults[i].callResult)
                      : txnInfo.txnResults[i].error}
                  </Alert>
                )}
            </Box>
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
            <Tooltip label={stager.signConditionFailed}>
              <Button
                size="lg"
                w="100%"
                isDisabled={txnHasError || !!stager.signConditionFailed}
                onClick={() => stager.sign()}
              >
                Queue &amp; Sign
              </Button>
            </Tooltip>
            <Tooltip label={stager.execConditionFailed}>
              <Button
                size="lg"
                w="100%"
                isDisabled={txnHasError || !!stager.execConditionFailed}
                onClick={() => execTxn.write()}
              >
                Execute
              </Button>
            </Tooltip>
          </HStack>
        </Box>
      )}
    </Container>
  )
}
