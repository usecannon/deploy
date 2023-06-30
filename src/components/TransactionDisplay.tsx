import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
} from '@chakra-ui/react'
import {
  Hex,
  decodeAbiParameters,
  decodeFunctionData,
  hexToString,
  keccak256,
  stringToBytes,
  toHex,
  trim,
  zeroAddress,
} from 'viem'

import MulticallABI from '../../backend/src/abi/Multicall.json'
import { DisplayedTransaction } from './DisplayedTransaction'
import { SafeTransaction } from '../types'
import {
  useCannonPackageContracts,
  useLoadCannonDefinition,
} from '../hooks/cannon'
import { useContractRead } from 'wagmi'

import * as onchainStore from '../utils/onchain-store'
import { useStore } from '../store'
import { useGitDiff } from '../hooks/git'
import { Diff, parseDiff } from 'react-diff-view'

export function TransactionDisplay(props: {
  safeTxn: SafeTransaction
  safeAddress: string
}) {
  const currentSafe = useStore((s) => s.currentSafe)
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
  let hintGitRepoUrl = ''
  let hintGitRepoHash = ''
  if (
    (decoded.functionName === 'aggregate3' ||
      decoded.functionName === 'aggregate3Value') &&
    decoded.args[0][0].target === zeroAddress
  ) {
    ;[hintType, hintCannonPackage, hintGitRepoUrl, hintGitRepoHash] =
      decodeAbiParameters(
        [{ type: 'string[]' }],
        decoded.args[0][0].callData
      )[0]
  }

  console.log('got hint data', hintCannonPackage, decoded)

  const cannonInfo = useCannonPackageContracts(
    hintCannonPackage ? '@' + hintCannonPackage.replace('://', ':') : ''
  )

  console.log('cannon info', cannonInfo)

  // git stuff
  const denom = hintGitRepoUrl?.lastIndexOf(':')
  const gitUrl = hintGitRepoUrl?.slice(0, denom)
  const gitFile = hintGitRepoUrl?.slice(denom + 1)

  // get previous deploy info git information
  console.log('use contract read', {
    functionName: 'getWithAddress',
    args: [props.safeAddress, keccak256(stringToBytes(hintGitRepoUrl))],
  })
  const prevDeployHashQuery = useContractRead({
    abi: onchainStore.ABI,
    address: onchainStore.deployAddress,
    functionName: 'getWithAddress',
    args: [props.safeAddress, keccak256(stringToBytes(hintGitRepoUrl))],
  })

  const prevDeployHash =
    prevDeployHashQuery?.data && trim(prevDeployHashQuery.data as Hex) != '0x00'
      ? (prevDeployHashQuery.data as Hex).slice(2, 42)
      : hintGitRepoHash

  console.log('prev deploy info', prevDeployHash)

  const cannonDefInfo = useLoadCannonDefinition(
    gitUrl,
    hintGitRepoHash,
    gitFile
  )
  console.log('git cannon def info', cannonDefInfo)

  const { patches } = useGitDiff(
    gitUrl,
    prevDeployHash,
    hintGitRepoHash,
    cannonDefInfo.filesList ? Array.from(cannonDefInfo.filesList) : []
  )

  if (cannonInfo.contracts && decoded.args.length) {
    const txns = (decoded.args[0] as any[])
      .slice(hintType === 'deploy' ? 2 : 1)
      .map((txn) => ({ to: txn.target, data: txn.callData, value: txn.value }))

    return (
      <Box maxW="100%">
        <Heading size="md">
          Transaction Type: {hintType} ({hintCannonPackage},{' '}
          {hintGitRepoUrl ? hintGitRepoUrl + '@' + hintGitRepoHash : 'git n/a'}
        </Heading>
        <Heading size="sm">Git Diff</Heading>

        <Box mb="6">
          {patches.map((p) => {
            try {
              console.log('parse the patch', p)
              console.log('got parsed diff', parseDiff(p))
              const { oldRevision, newRevision, type, hunks } = parseDiff(p)[0]
              return (
                <Diff
                  key={oldRevision + '-' + newRevision}
                  viewType="split"
                  diffType={type}
                  hunks={hunks}
                />
              )
            } catch (err) {
              console.error('diff didnt work:', err)

              return []
            }
          })}
        </Box>
        <Heading size="sm">Operations</Heading>
        {txns.map((txn, i) => (
          <DisplayedTransaction contracts={cannonInfo.contracts} txn={txn} />
        ))}
      </Box>
    )
  } else {
    return (
      <Container>
        <Alert status="info">
          <AlertIcon />
          Parsing transaction data...
        </Alert>
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
